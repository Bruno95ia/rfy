"""
Inferência: P(win), risk_delay, expected_close_days, forecast ajustado.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from config import get_settings
from feature_builder import (
    build_deal_features,
    encode_features_for_model,
    compute_org_baselines,
    compute_seller_stats,
)

# Mínimo de deals abertos para considerar forecast com alta confiança (Data & Model Policy)
MIN_DEALS_FOR_HIGH_CONFIDENCE = 20


def _load_latest_artifact(prefix: str):
    """Carrega o artefato mais recente com prefixo."""
    settings = get_settings()
    art_path = Path(settings.artifacts_path)
    if not art_path.exists():
        return None
    files = list(art_path.glob(f"{prefix}_*.joblib"))
    if not files:
        return None
    latest = max(files, key=lambda p: p.stat().st_mtime)
    return joblib.load(latest)


def predict_deal(
    deal_id: str,
    org_id: str,
    opportunities_df: pd.DataFrame,
    activities_by_hash: dict[str, list[dict]],
    org_baselines: dict[str, dict[str, float]],
    seller_stats: dict[str, dict[str, float]],
) -> dict[str, Any]:
    """
    Prediz P(win), risk_delay, expected_close_days para um deal.
    """
    clf_art = _load_latest_artifact("classifier")
    reg_art = _load_latest_artifact("regressor")

    if clf_art is None:
        return {
            "p_win": 0.5,
            "risk_delay": 0.5,
            "expected_close_days": 30,
            "model_version": None,
            "fallback": "no_model",
        }

    deal = opportunities_df[
        (opportunities_df["id"].astype(str) == str(deal_id))
        | (opportunities_df["crm_hash"] == deal_id)
    ]
    if deal.empty:
        return {"error": "Deal não encontrado"}

    deal = deal.iloc[0]
    features_df = build_deal_features(
        pd.DataFrame([deal.to_dict()]),
        activities_by_hash,
        org_baselines,
        seller_stats,
    )
    feat_names = clf_art.get("feature_names", [])
    X, _ = encode_features_for_model(features_df, feat_names)

    p_win = float(clf_art["model"].predict_proba(X)[0, 1])
    expected_close_days = 30.0
    if reg_art:
        X_reg = X.reindex(columns=reg_art["feature_names"], fill_value=0)
        pred = reg_art["model"].predict(X_reg)
        expected_close_days = max(1.0, float(pred[0]))

    stage_name = str(deal.get("stage_name", "")).lower()
    days_wo = float(features_df.iloc[0]["days_without_activity"])
    risk_delay = 0.0
    if "proposta" in stage_name and days_wo >= 7:
        risk_delay = min(1.0, 0.3 + days_wo / 30)
    elif days_wo >= 14:
        risk_delay = min(1.0, 0.5 + days_wo / 20)

    return {
        "p_win": round(p_win, 4),
        "risk_delay": round(risk_delay, 4),
        "expected_close_days": round(expected_close_days, 0),
        "model_version": "loaded",
        "fallback": None,
    }


def predict_forecast(
    org_id: str,
    opportunities_df: pd.DataFrame,
    activities_by_hash: dict[str, list[dict]],
    org_baselines: dict[str, dict[str, float]],
    seller_stats: dict[str, dict[str, float]],
) -> dict[str, Any]:
    """
    Forecast ajustado: Σ(deal_value * P(win)).
    Retorna forecast_adjusted, pipeline_bruto, diferença_percentual, breakdown.
    """
    open_deals = opportunities_df[
        (opportunities_df["org_id"].astype(str) == str(org_id))
        & (opportunities_df["status"] == "open")
    ]
    pipeline_bruto = float(open_deals["value"].sum() or 0)
    n_deals = len(open_deals)
    if open_deals.empty:
        return {
            "forecast_adjusted": 0.0,
            "pipeline_bruto": pipeline_bruto,
            "diferença_percentual": 0.0,
            "breakdown": {},
            "n_deals": 0,
            "forecast_confidence": "low",
            "data_quality_warning": "Nenhum deal aberto para esta base.",
        }

    features_df = build_deal_features(
        open_deals,
        activities_by_hash,
        org_baselines,
        seller_stats,
    )
    feat_names = None
    clf_art = _load_latest_artifact("classifier")
    if clf_art:
        feat_names = clf_art["feature_names"]

    X, _ = encode_features_for_model(features_df, feat_names)
    probs = None
    if clf_art and feat_names:
        X = X.reindex(columns=feat_names, fill_value=0)
        probs = clf_art["model"].predict_proba(X)[:, 1]
    else:
        probs = [0.5] * len(open_deals)

    forecast_adjusted = 0.0
    breakdown: dict[str, float] = {}
    for i, (_, row) in enumerate(open_deals.iterrows()):
        stage = row.get("stage_name") or "Outros"
        stage_str = str(stage)
        val = float(row.get("value") or 0)
        p = float(probs[i]) if i < len(probs) else 0.5
        weighted = val * p
        forecast_adjusted += weighted
        breakdown[stage_str] = breakdown.get(stage_str, 0) + weighted

    diff = pipeline_bruto - forecast_adjusted
    diferença_percentual = (
        (diff / pipeline_bruto * 100) if pipeline_bruto > 0 else 0.0
    )

    # Confiança do forecast: alta só com modelo treinado e base com volume mínimo
    fallback = clf_art is None
    if fallback or n_deals < MIN_DEALS_FOR_HIGH_CONFIDENCE:
        forecast_confidence = "low"
        if fallback:
            data_quality_warning = (
                "Modelo não treinado; previsão usa estimativa neutra (50%)."
            )
        else:
            data_quality_warning = (
                f"Poucos deals para esta base ({n_deals}); "
                f"previsão com baixa confiança (recomendado ≥{MIN_DEALS_FOR_HIGH_CONFIDENCE})."
            )
    else:
        forecast_confidence = "high"
        data_quality_warning = None

    return {
        "forecast_adjusted": round(forecast_adjusted, 2),
        "pipeline_bruto": round(pipeline_bruto, 2),
        "diferença_percentual": round(diferença_percentual, 2),
        "breakdown": {k: round(v, 2) for k, v in breakdown.items()},
        "n_deals": n_deals,
        "fallback": fallback,
        "forecast_confidence": forecast_confidence,
        "data_quality_warning": data_quality_warning,
    }
