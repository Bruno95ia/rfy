"""
AI Service - FastAPI microserviço para inferência, treino e benchmarking.
"""
from __future__ import annotations

import json
import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from config import get_settings
from db import raw_connection
from feature_builder import (
    build_deal_features,
    compute_org_baselines,
    compute_seller_stats,
)
from benchmark import (
    assign_clusters,
    compute_cluster_stats,
    get_benchmark_for_org,
    build_org_profile,
    check_k_anonymity,
)
from predictor import predict_deal, predict_forecast
from trainer import train
from intervention_engine import compute_interventions

app = FastAPI(
    title="Revenue Engine AI Service",
    description="Inferência, treino e benchmarking para pipeline comercial",
    version="1.0.0",
)

_cors_origins = ["*"]
_settings = get_settings()
if _settings.cors_origins and _settings.cors_origins.strip() != "*":
    _cors_origins = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)


def _safe_error_detail(exc: BaseException) -> str:
    """Em produção retorna mensagem genérica; em debug retorna detalhe."""
    if get_settings().debug:
        return str(exc)
    logger.exception("Erro interno (não exposto ao cliente)")
    return "Erro interno. Contate o suporte."


# --- Schemas ---
class PredictDealRequest(BaseModel):
    deal_id: str
    org_id: str


class PredictForecastRequest(BaseModel):
    org_id: str


class BenchmarkCompanyRequest(BaseModel):
    org_id: str


class PredictInterventionsRequest(BaseModel):
    org_id: str


def require_train_secret(
    x_train_api_key: str | None = Header(None, alias="X-Train-API-Key"),
    authorization: str | None = Header(None),
) -> None:
    """Exige AI_TRAIN_SECRET no header quando configurado (proteção contra DoS)."""
    secret = get_settings().train_secret
    if not secret:
        return
    provided = x_train_api_key
    if not provided and authorization and authorization.startswith("Bearer "):
        provided = authorization[7:].strip()
    if provided != secret:
        raise HTTPException(status_code=403, detail="Acesso negado ao endpoint de treino")


# --- Data loading helpers ---
@contextmanager
def load_org_data(org_id: str | None = None):
    """Carrega opportunities e activities do DB."""
    with raw_connection() as conn:
        opp_sql = """
            SELECT id, org_id, crm_hash, stage_name, status, value, company_name,
                   created_date, closed_date, owner_email, owner_name, stage_timing_days
            FROM opportunities
            WHERE status IN ('open', 'won', 'lost')
        """
        params: dict[str, str] = {}
        if org_id:
            opp_sql += " AND org_id = :org_id"
            params["org_id"] = org_id
        opp_df = pd.read_sql(text(opp_sql), conn, params=params if params else {})

        act_sql = """
            SELECT linked_opportunity_hash, done_at, start_at, created_at_crm
            FROM activities
            WHERE linked_opportunity_hash IS NOT NULL
        """
        act_df = pd.read_sql(text(act_sql), conn)

    activities_by_hash: dict[str, list[dict]] = {}
    for _, row in act_df.iterrows():
        h = str(row["linked_opportunity_hash"])
        if h not in activities_by_hash:
            activities_by_hash[h] = []
        activities_by_hash[h].append(row.to_dict())

    yield opp_df, activities_by_hash


def load_all_opportunities():
    """Carrega todas as opportunities (para treino/benchmark)."""
    with raw_connection() as conn:
        opp_df = pd.read_sql(
            """
            SELECT id, org_id, crm_hash, stage_name, status, value, company_name,
                   created_date, closed_date, owner_email, owner_name, stage_timing_days
            FROM opportunities
            WHERE status IN ('open', 'won', 'lost')
            """,
            conn,
        )
    return opp_df


# --- Endpoints ---
@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/predict/deal")
def api_predict_deal(req: PredictDealRequest) -> dict[str, Any]:
    """Prediz P(win), risk_delay, expected_close_days para um deal."""
    try:
        with load_org_data() as (all_opp, _):
            org_baselines = compute_org_baselines(all_opp)
            seller_stats = compute_seller_stats(all_opp)
        with load_org_data(req.org_id) as (opp_df, activities_by_hash):
            result = predict_deal(
                req.deal_id,
                req.org_id,
                opp_df,
                activities_by_hash,
                org_baselines,
                seller_stats,
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_error_detail(e))


@app.post("/predict/forecast")
def api_predict_forecast(req: PredictForecastRequest) -> dict[str, Any]:
    """Forecast ajustado por P(win) para uma org."""
    try:
        with load_org_data() as (all_opp, _):
            org_baselines = compute_org_baselines(all_opp)
            seller_stats = compute_seller_stats(all_opp)
        with load_org_data(req.org_id) as (opp_df, activities_by_hash):
            result = predict_forecast(
                req.org_id,
                opp_df,
                activities_by_hash,
                org_baselines,
                seller_stats,
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_error_detail(e))


@app.post("/benchmark/company")
def api_benchmark_company(req: BenchmarkCompanyRequest) -> dict[str, Any]:
    """Retorna benchmark vs cluster para a org (k-anonymity aplicado)."""
    try:
        opp_df = load_all_opportunities()
        if opp_df.empty:
            return {"status": "no_data", "message": "Sem dados para benchmark"}

        # Construir org_metrics para cada org
        org_metrics_rows = []
        for org_id, grp in opp_df.groupby("org_id"):
            won = grp[grp["status"] == "won"]
            lost = grp[grp["status"] == "lost"]
            open_df = grp[grp["status"] == "open"]
            total = len(won) + len(lost)
            win_rate = len(won) / total if total > 0 else 0.3
            cycles = []
            for _, r in pd.concat([won, lost]).iterrows():
                cd, cr = r.get("closed_date"), r.get("created_date")
                if pd.notna(cd) and pd.notna(cr):
                    try:
                        t_cd = pd.to_datetime(cd, utc=True)
                        t_cr = pd.to_datetime(cr, utc=True)
                        if getattr(t_cd, "tz", None):
                            t_cd = t_cd.replace(tzinfo=None)
                        if getattr(t_cr, "tz", None):
                            t_cr = t_cr.replace(tzinfo=None)
                        d = (t_cd - t_cr).days
                        if d >= 0:
                            cycles.append(d)
                    except Exception:
                        pass
            median_cycle = float(pd.Series(cycles).median()) if cycles else 30
            proposta = open_df[
                open_df["stage_name"].fillna("").str.lower().str.contains("proposta", na=False)
            ]
            n_prop = len(proposta)
            stagnation = n_prop  # simplificado
            stagnation_rate = stagnation / n_prop if n_prop > 0 else 0.2
            abandoned = len(open_df)  # simplificado
            abandoned_rate = abandoned / len(open_df) if len(open_df) > 0 else 0
            pipeline_value = open_df["value"].sum() or 0
            ticket_median = grp["value"].median() or 0
            sellers_count = grp["owner_email"].fillna(grp["owner_name"]).nunique() or 1

            org_metrics_rows.append({
                "org_id": str(org_id),
                "cycle_median": median_cycle,
                "win_rate": win_rate,
                "proposal_stagnation_rate": stagnation_rate,
                "abandoned_rate": abandoned_rate,
                "pipeline_value_open": pipeline_value,
                "ticket_median": ticket_median,
                "sellers_count": sellers_count,
            })

        org_metrics_df = pd.DataFrame(org_metrics_rows)
        profile_df = org_metrics_df[["org_id", "ticket_median", "cycle_median", "sellers_count"]].copy()
        profile_df["revenue_band_encoded"] = 0
        profile_df["segment_encoded"] = 0
        org_to_cluster = assign_clusters(profile_df)
        cluster_stats = compute_cluster_stats(org_metrics_df, org_to_cluster)

        org_row = org_metrics_df[org_metrics_df["org_id"] == req.org_id]
        if org_row.empty:
            return {"status": "org_not_found", "message": "Org não encontrada"}

        org_metrics = org_row.iloc[0].to_dict()
        return get_benchmark_for_org(
            req.org_id,
            org_metrics,
            cluster_stats,
            org_to_cluster,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_error_detail(e))


@app.post("/predict/interventions")
def api_predict_interventions(req: PredictInterventionsRequest) -> list[dict[str, Any]]:
    """Top 10 intervenções priorizadas por Impact Score (IA)."""
    try:
        with load_org_data() as (all_opp, _):
            org_baselines = compute_org_baselines(all_opp)
            seller_stats = compute_seller_stats(all_opp)
        with load_org_data(req.org_id) as (opp_df, activities_by_hash):
            open_deals = opp_df[opp_df["status"] == "open"]
            if open_deals.empty:
                return []

            features_df = build_deal_features(
                open_deals,
                activities_by_hash,
                org_baselines,
                seller_stats,
            )

            clf_art = None
            art_path = Path(get_settings().artifacts_path)
            if art_path.exists():
                files = list(art_path.glob("classifier_*.joblib"))
                if files:
                    import joblib
                    latest = max(files, key=lambda p: p.stat().st_mtime)
                    clf_art = joblib.load(latest)

            p_win_by_deal: dict[str, float] = {}
            if clf_art:
                from feature_builder import encode_features_for_model
                feat_names = clf_art.get("feature_names", [])
                X, _ = encode_features_for_model(features_df, feat_names)
                X = X.reindex(columns=feat_names, fill_value=0)
                probs = clf_art["model"].predict_proba(X)[:, 1]
                for i, (_, row) in enumerate(features_df.iterrows()):
                    key = str(row.get("deal_id", "")) or str(row.get("crm_hash", ""))
                    p_win_by_deal[key] = float(probs[i]) if i < len(probs) else 0.5
            else:
                for _, row in features_df.iterrows():
                    key = str(row.get("deal_id", "")) or str(row.get("crm_hash", ""))
                    p_win_by_deal[key] = 0.5

            return compute_interventions(
                features_df,
                p_win_by_deal,
                open_deals,
                top_n=10,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_error_detail(e))


@app.post("/train")
def api_train(_: None = Depends(require_train_secret)) -> dict[str, Any]:
    """Dispara treinamento e retorna métricas."""
    try:
        result = train()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=_safe_error_detail(e))


@app.get("/models")
def api_models() -> list[dict]:
    """Lista versões de modelos."""
    try:
        with raw_connection() as conn:
            r = conn.execute(text("""
                SELECT model_name, version, trained_at, metrics_json
                FROM model_versions
                ORDER BY trained_at DESC
                LIMIT 20
            """))
            rows = r.fetchall()
        def _parse_metrics(val):
            if val is None:
                return {}
            if isinstance(val, dict):
                return val
            try:
                return json.loads(val) if isinstance(val, str) else {}
            except Exception:
                return {}

        return [
            {
                "model_name": row[0],
                "version": row[1],
                "trained_at": str(row[2]) if row[2] is not None else None,
                "metrics": _parse_metrics(row[3]),
            }
            for row in rows
        ]
    except Exception:
        return []


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
