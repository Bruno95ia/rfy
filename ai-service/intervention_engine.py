"""
Intervention Engine (Copiloto): ranking de intervenções por impacto financeiro.

LÓGICA DE PRIORIZAÇÃO (vendas complexas):
  - Valor em risco: value × (1 - P(win)) — quanto maior o valor e menor a probabilidade
    de fechamento, maior o valor em jogo.
  - Urgência: fator que cresce com dias sem atividade (logarítmico para não dominar
    só por “muito tempo parado”; prioriza reativar deals que ainda têm chance).
  - Peso de etapa: etapas mais avançadas (proposta, aprovação) têm maior peso — o
    custo de perder um deal em proposta é maior que um em lead.

Fórmula: Impact Score = value × (1 - P(win)) × urgency(days_wo) × stage_weight
  - urgency(d) = 1 + log2(1 + d/7), limitado a 3.0
  - Ordenação: maior Impact Score primeiro (top N).
"""
from __future__ import annotations

import math
from typing import Any

import pandas as pd

# Peso por etapa: etapas mais avançadas = maior impacto se perdido (vendas complexas)
STAGE_WEIGHTS = {
    "proposta": 1.5,
    "aprovação": 1.3,
    "aprovacao": 1.3,
    "negociação": 1.1,
    "negociacao": 1.1,
    "qualificação": 1.0,
    "qualificacao": 1.0,
    "lead": 0.9,
}

# Urgência: teto para o fator log (evita que só "dias parados" domine)
URGENCY_CAP = 3.0


def _stage_weight(stage_name: str) -> float:
    """Retorna peso da etapa (default 1.0)."""
    if not stage_name:
        return 1.0
    stage_lower = str(stage_name).lower()
    for key, w in STAGE_WEIGHTS.items():
        if key in stage_lower:
            return w
    return 1.0


def _urgency_factor(days_without_activity: float) -> float:
    """
    Fator de urgência por dias sem atividade.
    Cresce logarítmicamente: 0d=1.0, 7d≈1.41, 14d≈1.71, 30d≈2.17 (limitado a URGENCY_CAP).
    Prioriza reativar deals parados sem que um único deal “muito parado” domine o ranking.
    """
    if days_without_activity <= 0:
        return 1.0
    raw = 1.0 + math.log2(1.0 + days_without_activity / 7.0)
    return min(raw, URGENCY_CAP)


def _recommended_action(
    days_without_activity: float,
    stage_name: str,
    p_win: float,
) -> str:
    """Recomendação prescritiva por contexto (etapa + inatividade + P(win))."""
    stage_lower = str(stage_name or "").lower()
    if days_without_activity >= 14 and p_win < 0.5:
        return "Agendar follow-up imediato"
    if "proposta" in stage_lower and days_without_activity >= 7:
        return "Revisar proposta e reativar contato"
    if "aprovacao" in stage_lower or "aprovação" in stage_lower:
        if days_without_activity >= 5:
            return "Checar status com aprovador e desbloquear"
        return "Validar prazo de aprovação com o decisor"
    if days_without_activity >= 10:
        return "Validar interesse com o tomador de decisão"
    if days_without_activity >= 5:
        return "Enviar conteúdo de valor e agendar call"
    return "Manter cadência de contato e próximo passo claro"


def _impact_rationale(
    value: float,
    p_win: float,
    days_wo: float,
    stage_weight: float,
    impact_score: float,
) -> str:
    """Texto curto explicando por que o deal foi priorizado (explicabilidade)."""
    value_at_risk = value * (1 - p_win)
    parts = []
    if value_at_risk > 0:
        parts.append(f"valor em risco alto")
    if p_win < 0.4:
        parts.append("P(win) baixa")
    elif p_win < 0.6:
        parts.append("P(win) moderada")
    if days_wo >= 14:
        parts.append("muitos dias sem atividade")
    elif days_wo >= 7:
        parts.append("dias sem atividade")
    if not parts:
        parts.append("oportunidade de reativação")
    return "; ".join(parts)


def compute_interventions(
    features_df: pd.DataFrame,
    p_win_by_deal: dict[str, float],
    open_deals: pd.DataFrame,
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """
    Calcula Impact Score e retorna top N intervenções priorizadas por impacto financeiro.

    Priorização:
      - Impact Score = value × (1 - P(win)) × urgency(days_wo) × stage_weight
      - Maior score = maior impacto esperado da intervenção (valor em risco + urgência + etapa).

    Params:
      features_df: deal_id/crm_hash, value, days_without_activity, stage_name
      p_win_by_deal: {deal_id ou crm_hash: P(win)}
      open_deals: id, crm_hash, company_name para lookup
      top_n: número de intervenções retornadas (default 10)
    """
    rows = []
    for _, row in features_df.iterrows():
        deal_id = str(row.get("deal_id", ""))
        crm_hash = str(row.get("crm_hash", ""))
        key = deal_id or crm_hash
        p_win = p_win_by_deal.get(key, 0.5)
        value = float(row.get("value", 0) or 0)
        days_wo = float(row.get("days_without_activity", 0) or 0)
        stage_name = row.get("stage_name") or ""

        stage_weight = _stage_weight(stage_name)
        urgency = _urgency_factor(days_wo)
        impact_score = value * (1 - p_win) * urgency * stage_weight

        company = ""
        if not open_deals.empty:
            match = open_deals[
                (open_deals["id"].astype(str) == deal_id)
                | (open_deals["crm_hash"].astype(str) == crm_hash)
            ]
            if not match.empty:
                company = str(match.iloc[0].get("company_name", "")) or "Cliente"

        recommended = _recommended_action(days_wo, stage_name, p_win)
        rationale = _impact_rationale(
            value, p_win, days_wo, stage_weight, impact_score
        )

        rows.append({
            "deal_id": key,
            "company": company,
            "impact_score": round(impact_score, 2),
            "p_win": round(p_win, 4),
            "value": value,
            "days_without_activity": days_wo,
            "stage_name": stage_name,
            "recommended_action": recommended,
            "impact_rationale": rationale,
        })

    sorted_rows = sorted(
        rows,
        key=lambda x: x["impact_score"],
        reverse=True,
    )
    return [
        {
            "deal_id": r["deal_id"],
            "company": r["company"],
            "impact_score": r["impact_score"],
            "p_win": r["p_win"],
            "recommended_action": r["recommended_action"],
            "impact_rationale": r["impact_rationale"],
            "value": r["value"],
            "days_without_activity": r["days_without_activity"],
            "stage_name": r["stage_name"],
        }
        for r in sorted_rows[:top_n]
    ]
