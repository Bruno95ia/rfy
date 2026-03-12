"""
Pipeline de treinamento: LightGBM Classifier (P(win)) e Regressor (expected_close_days).
Split temporal obrigatório. MLflow para versionamento. training_logs para auditoria.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    roc_auc_score,
    precision_score,
    recall_score,
    mean_absolute_error,
)
import lightgbm as lgb

from config import get_settings
from feature_builder import (
    build_deal_features,
    encode_features_for_model,
    compute_org_baselines,
    compute_seller_stats,
)


def _to_naive_ts(val):
    """Timestamp sem timezone para subtrações (evita tz-naive vs tz-aware)."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    t = pd.to_datetime(val, utc=True)
    if getattr(t, "tz", None) is not None:
        t = t.replace(tzinfo=None)
    return t


def _precision_at_k(y_true: np.ndarray, y_proba: np.ndarray, k: float = 0.2) -> float:
    """Precision@K: dos top K% por probabilidade, quantos são realmente positivos."""
    if len(y_true) == 0:
        return 0.0
    n = max(1, int(len(y_true) * k))
    top_idx = np.argsort(y_proba)[-n:]
    tp = y_true[top_idx].sum()
    return float(tp / n) if n > 0 else 0.0


def load_opportunities_and_activities(db_conn) -> tuple[pd.DataFrame, dict]:
    """Carrega opportunities e activities do Postgres."""
    opp_query = """
        SELECT id, org_id, crm_hash, stage_name, status, value,
               created_date, closed_date, owner_email, owner_name, stage_timing_days
        FROM opportunities
        WHERE status IN ('open', 'won', 'lost')
    """
    opp_df = pd.read_sql(opp_query, db_conn)

    act_query = """
        SELECT linked_opportunity_hash, done_at, start_at, created_at_crm
        FROM activities
        WHERE linked_opportunity_hash IS NOT NULL
    """
    act_df = pd.read_sql(act_query, db_conn)

    activities_by_hash: dict[str, list[dict]] = {}
    for _, row in act_df.iterrows():
        h = str(row["linked_opportunity_hash"])
        if h not in activities_by_hash:
            activities_by_hash[h] = []
        activities_by_hash[h].append(row.to_dict())

    return opp_df, activities_by_hash


def train(
    artifacts_path: str | None = None,
    val_split: float = 0.2,
    db_session=None,
) -> dict:
    """
    Treina classifier e regressor, salva artefatos, registra no MLflow,
    insere em training_logs. Retorna métricas.
    """
    settings = get_settings()
    art_path = Path(artifacts_path or settings.artifacts_path)
    art_path.mkdir(parents=True, exist_ok=True)

    run_id = str(uuid.uuid4())[:8]

    from db import raw_connection

    try:
        with raw_connection() as conn:
            opp_df, activities_by_hash = load_opportunities_and_activities(conn)
    except Exception as e:
        return {"error": str(e), "ok": False}

    if len(opp_df) < 20:
        return {"error": "Poucos dados para treino (mínimo 20)", "ok": False}

    org_baselines = compute_org_baselines(opp_df)
    seller_stats = compute_seller_stats(opp_df)

    features_df = build_deal_features(
        opp_df,
        activities_by_hash,
        org_baselines,
        seller_stats,
        cluster_median_cycle=None,
    )

    # Split temporal: ordenar por created_date, últimos N% para validação
    features_df = features_df.sort_values("created_date", na_position="last")
    n_val = max(1, int(len(features_df) * val_split))
    train_df = features_df.iloc[:-n_val]
    val_df = features_df.iloc[-n_val:]

    # Classifier: won vs lost (ignorar open no treino)
    clf_data = train_df[train_df["status"].isin(["won", "lost"])]
    if len(clf_data) < 10:
        return {"error": "Poucos deals won/lost para treino", "ok": False}

    X_train_clf, feat_names = encode_features_for_model(clf_data)
    y_train_clf = (clf_data["status"] == "won").astype(int)

    clf = lgb.LGBMClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        verbosity=-1,
    )
    clf.fit(X_train_clf, y_train_clf)

    # Validar classifier
    val_clf = val_df[val_df["status"].isin(["won", "lost"])]
    auc, precision_k, recall = 0.0, 0.0, 0.0
    if len(val_clf) > 0:
        X_val_clf, _ = encode_features_for_model(val_clf, feat_names)
        y_val_clf = (val_clf["status"] == "won").astype(int)
        pred_proba = clf.predict_proba(X_val_clf)[:, 1]
        pred_bin = (pred_proba >= 0.5).astype(int)
        auc = float(roc_auc_score(y_val_clf, pred_proba))
        precision_k = _precision_at_k(y_val_clf.values, pred_proba, k=0.2)
        recall = float(
            recall_score(y_val_clf, pred_bin, zero_division=0)
        )

    # Regressor: expected_close_days (apenas won/lost com closed_date)
    reg_data = train_df[train_df["status"].isin(["won", "lost"])].copy()
    def _cycle_days(r):
        cd = _to_naive_ts(r["closed_date"])
        cr = _to_naive_ts(r["created_date"])
        if cd is None or cr is None:
            return np.nan
        return (cd - cr).days

    reg_data["expected_close_days"] = reg_data.apply(
        lambda r: _cycle_days(r) if pd.notna(r["closed_date"]) and pd.notna(r["created_date"]) else np.nan,
        axis=1,
    )
    reg_data = reg_data.dropna(subset=["expected_close_days"])
    reg_data = reg_data[reg_data["expected_close_days"] >= 0]

    mae = 0.0
    reg = None
    if len(reg_data) >= 5:
        X_train_reg, _ = encode_features_for_model(reg_data, feat_names)
        y_train_reg = reg_data["expected_close_days"]
        reg = lgb.LGBMRegressor(
            n_estimators=80,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            verbosity=-1,
        )
        reg.fit(X_train_reg, y_train_reg)

        val_reg = val_df[val_df["status"].isin(["won", "lost"])].copy()
        val_reg["expected_close_days"] = val_reg.apply(
            lambda r: _cycle_days(r) if pd.notna(r["closed_date"]) and pd.notna(r["created_date"]) else np.nan,
            axis=1,
        )
        val_reg = val_reg.dropna(subset=["expected_close_days"])
        if len(val_reg) > 0:
            X_val_reg, _ = encode_features_for_model(val_reg, feat_names)
            mae = float(
                mean_absolute_error(
                    val_reg["expected_close_days"],
                    reg.predict(X_val_reg),
                )
            )

    # Salvar artefatos
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    clf_path = art_path / f"classifier_{ts}.joblib"
    joblib.dump({"model": clf, "feature_names": feat_names}, clf_path)

    reg_path = None
    if reg is not None:
        reg_path = art_path / f"regressor_{ts}.joblib"
        joblib.dump({"model": reg, "feature_names": feat_names}, reg_path)

    metrics = {
        "auc": round(auc, 4),
        "precision_at_k": round(precision_k, 4),
        "recall": round(recall, 4),
        "mae": round(mae, 2),
        "n_train": len(clf_data),
        "n_val": len(val_clf),
    }

    # MLflow (se configurado)
    mlflow_uri = os.environ.get("MLFLOW_TRACKING_URI")
    if mlflow_uri:
        try:
            import mlflow
            import mlflow.lightgbm

            mlflow.set_tracking_uri(mlflow_uri)
            with mlflow.start_run(run_name=f"revenue-engine-{ts}") as run:
                mlflow.log_params({
                    "n_estimators_clf": 100,
                    "max_depth_clf": 6,
                    "val_split": val_split,
                })
                mlflow.log_metrics(metrics)
                mlflow.lightgbm.log_model(clf, "classifier")
                if reg is not None:
                    mlflow.lightgbm.log_model(reg, "regressor")
                mlflow.set_tag("run_id", run_id)
        except Exception:
            pass

    # Registrar em model_versions
    try:
        from sqlalchemy import text

        with raw_connection() as conn:
            conn.execute(
                text("""
                    INSERT INTO model_versions (model_name, version, trained_at, metrics_json, artifact_path)
                    VALUES (:name, :version, :trained_at, :metrics, :path)
                """),
                {
                    "name": "deal_classifier",
                    "version": ts,
                    "trained_at": datetime.utcnow(),
                    "metrics": json.dumps(metrics),
                    "path": str(clf_path),
                },
            )
            conn.commit()
    except Exception:
        pass

    # Registrar em training_logs
    try:
        from sqlalchemy import text

        with raw_connection() as conn:
            conn.execute(
                text("""
                    INSERT INTO training_logs (run_id, model_name, auc, precision_at_k, recall, mae, n_train, n_val)
                    VALUES (:run_id, :model_name, :auc, :precision_at_k, :recall, :mae, :n_train, :n_val)
                """),
                {
                    "run_id": run_id,
                    "model_name": "deal_classifier",
                    "auc": auc,
                    "precision_at_k": precision_k,
                    "recall": recall,
                    "mae": mae,
                    "n_train": len(clf_data),
                    "n_val": len(val_clf),
                },
            )
            conn.commit()
    except Exception:
        pass

    return {
        "ok": True,
        "run_id": run_id,
        "metrics": metrics,
        "classifier_path": str(clf_path),
        "regressor_path": str(reg_path) if reg_path else None,
        "feature_names": feat_names,
    }
