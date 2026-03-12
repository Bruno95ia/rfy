"""
Feature engineering para pipeline de ML.
Gera features por deal e por org para treino e inferência.
Features conforme spec: stage_name (one-hot), days_without_activity, age_days,
value, stage_timing_days, activity_count_last_7/14/30, seller_win_rate,
seller_avg_cycle, org_median_cycle, org_win_rate, org_proposal_stagnation_rate,
deviation_vs_org_cycle, deviation_vs_cluster_cycle, stage_position_percentage.
"""
from __future__ import annotations

import hashlib
from typing import Any

import numpy as np
import pandas as pd

# Ordem típica de etapas para stage_position_percentage (0-100%)
DEFAULT_STAGE_ORDER = [
    "lead",
    "qualificação",
    "qualificacao",
    "negociação",
    "negociacao",
    "proposta",
    "aprovação",
    "aprovacao",
    "won",
    "lost",
]


def _hash_seller(s: str | None) -> str:
    """Hash determinístico para seller_id (anonimização)."""
    if s is None or (isinstance(s, float) and np.isnan(s)):
        return "unknown"
    return hashlib.sha256(str(s).encode()).hexdigest()[:12]


def _to_naive_ts(val: Any) -> pd.Timestamp | None:
    """Converte para Timestamp sem timezone para subtrações seguras (evita tz-naive vs tz-aware)."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    t = pd.to_datetime(val, utc=True)
    if t.tz is not None:
        t = t.replace(tzinfo=None)
    return t


def _days_between(d1: str | None, d2: str | None) -> float | None:
    """Retorna dias entre duas datas ou None."""
    if not d1 or not d2:
        return None
    try:
        a = pd.to_datetime(d1).date()
        b = pd.to_datetime(d2).date()
        return float((b - a).days)
    except Exception:
        return None


def _stage_position_pct(stage_name: str) -> float:
    """
    Retorna posição percentual da etapa no pipeline (0-100).
    Etapas iniciais = baixo %, etapas finais = alto %.
    """
    if not stage_name:
        return 0.0
    stage_lower = str(stage_name).lower().strip()
    for i, name in enumerate(DEFAULT_STAGE_ORDER):
        if name in stage_lower or stage_lower in name:
            # Linear de 0 a 100 excluindo won/lost
            if name in ("won", "lost"):
                return 100.0
            return (i / (len(DEFAULT_STAGE_ORDER) - 2)) * 100
    # Etapa desconhecida: estimar por posição intermediária
    return 50.0


def _activity_in_window(act: dict, ref: pd.Timestamp, days: int) -> bool:
    t = act.get("done_at") or act.get("start_at") or act.get("created_at_crm")
    if not t:
        return False
    try:
        dt = _to_naive_ts(t)
        ref_naive = ref if ref.tz is None else ref.replace(tzinfo=None)
        if dt is None:
            return False
        return (ref_naive - dt).days <= days
    except Exception:
        return False


def build_deal_features(
    opportunities: pd.DataFrame,
    activities_by_hash: dict[str, list[dict[str, Any]]],
    org_baselines: dict[str, dict[str, float]],
    seller_stats: dict[str, dict[str, float]],
    cluster_median_cycle: dict[str, float] | None = None,
    ref_date: str | None = None,
) -> pd.DataFrame:
    """
    Constrói features por deal (oportunidade).
    opportunities: DataFrame com id, org_id, crm_hash, stage_name, status, value,
                  created_date, closed_date, owner_email, owner_name, stage_timing_days
    activities_by_hash: {crm_hash: [{done_at, start_at, created_at_crm}]}
    org_baselines: {org_id: {median_cycle_org, win_rate_org, proposal_stagnation_rate_org}}
    seller_stats: {seller_hash: {win_rate_seller, avg_cycle_seller}}
    cluster_median_cycle: {org_id: cycle_median} opcional para deviation_vs_cluster
    """
    ref = _to_naive_ts(ref_date) if ref_date else pd.Timestamp.now()
    if ref is None:
        ref = pd.Timestamp.now()
    rows = []

    for _, opp in opportunities.iterrows():
        org_id = str(opp.get("org_id", ""))
        crm_hash = str(opp.get("crm_hash", ""))
        stage_name = opp.get("stage_name") or "unknown"
        status = opp.get("status") or "open"
        value = float(opp.get("value") or 0)
        created_date = opp.get("created_date")
        closed_date = opp.get("closed_date")
        owner = opp.get("owner_name") or opp.get("owner_email") or "unknown"
        seller_hash = _hash_seller(str(owner))

        acts = activities_by_hash.get(crm_hash, [])
        last_activity = None
        for a in acts:
            t = a.get("done_at") or a.get("start_at") or a.get("created_at_crm")
            if t:
                if last_activity is None or t > last_activity:
                    last_activity = t

        raw_ref_dt = last_activity or created_date or ref
        ref_dt = _to_naive_ts(raw_ref_dt) if raw_ref_dt is not None else ref
        if ref_dt is None:
            ref_dt = ref
        days_without_activity = (
            (ref - ref_dt).days if isinstance(ref_dt, pd.Timestamp) else 0
        )
        days_without_activity = max(0, days_without_activity)

        age_days = _days_between(created_date, str(ref.date())) or 0
        stage_timing_days = float(opp.get("stage_timing_days") or 0)

        activity_count_last_7 = sum(
            1 for a in acts if _activity_in_window(a, ref, 7)
        )
        activity_count_last_14 = sum(
            1 for a in acts if _activity_in_window(a, ref, 14)
        )
        activity_count_last_30 = sum(
            1 for a in acts if _activity_in_window(a, ref, 30)
        )

        org_bl = org_baselines.get(org_id, {})
        median_cycle_org = org_bl.get("median_cycle_org", 30)
        org_win_rate = org_bl.get("win_rate_org", 0.3)
        org_proposal_stagnation_rate = org_bl.get(
            "proposal_stagnation_rate_org", 0.2
        )

        seller_s = seller_stats.get(seller_hash, {})
        seller_win_rate = seller_s.get("win_rate_seller", 0.3)
        seller_avg_cycle = seller_s.get("avg_cycle_seller", 30)

        # expected_close_days (ciclo) para deals fechados
        actual_cycle = None
        if pd.notna(closed_date) and pd.notna(created_date):
            actual_cycle = _days_between(
                str(created_date), str(closed_date)
            )
        deviation_vs_org_cycle = 0.0
        if actual_cycle is not None and median_cycle_org > 0:
            deviation_vs_org_cycle = (actual_cycle - median_cycle_org) / median_cycle_org

        cluster_cycle = (
            cluster_median_cycle.get(org_id, median_cycle_org)
            if cluster_median_cycle
            else median_cycle_org
        )
        deviation_vs_cluster_cycle = 0.0
        if actual_cycle is not None and cluster_cycle > 0:
            deviation_vs_cluster_cycle = (
                actual_cycle - cluster_cycle
            ) / cluster_cycle

        stage_position_percentage = _stage_position_pct(str(stage_name))

        row = {
            "deal_id": opp.get("id"),
            "org_id": org_id,
            "crm_hash": crm_hash,
            "stage_name": stage_name,
            "status": status,
            "value": value,
            "days_without_activity": days_without_activity,
            "age_days": age_days,
            "stage_timing_days": stage_timing_days,
            "activity_count_last_7": activity_count_last_7,
            "activity_count_last_14": activity_count_last_14,
            "activity_count_last_30": activity_count_last_30,
            "seller_win_rate": seller_win_rate,
            "seller_avg_cycle": seller_avg_cycle,
            "org_median_cycle": median_cycle_org,
            "org_win_rate": org_win_rate,
            "org_proposal_stagnation_rate": org_proposal_stagnation_rate,
            "deviation_vs_org_cycle": deviation_vs_org_cycle,
            "deviation_vs_cluster_cycle": deviation_vs_cluster_cycle,
            "stage_position_percentage": stage_position_percentage,
            "created_date": created_date,
            "closed_date": closed_date,
            "owner_hash": seller_hash,
        }
        rows.append(row)

    return pd.DataFrame(rows)


def encode_features_for_model(
    df: pd.DataFrame, feature_names: list[str] | None = None
) -> tuple[pd.DataFrame, list[str]]:
    """
    Aplica one-hot em stage_name e gera matriz numérica.
    Retorna (X, feature_names).
    Se feature_names for passado, alinha X às colunas esperadas.
    """
    stage_dummies = pd.get_dummies(
        df["stage_name"].astype(str), prefix="stage", drop_first=False
    )

    numeric_cols = [
        "days_without_activity",
        "age_days",
        "value",
        "stage_timing_days",
        "activity_count_last_7",
        "activity_count_last_14",
        "activity_count_last_30",
        "seller_win_rate",
        "seller_avg_cycle",
        "org_median_cycle",
        "org_win_rate",
        "org_proposal_stagnation_rate",
        "deviation_vs_org_cycle",
        "deviation_vs_cluster_cycle",
        "stage_position_percentage",
    ]

    for c in numeric_cols:
        if c not in df.columns:
            df[c] = 0

    X_num = df[numeric_cols].fillna(0).astype(float)
    X = pd.concat(
        [X_num.reset_index(drop=True), stage_dummies.reset_index(drop=True)],
        axis=1,
    )

    if feature_names:
        X = X.reindex(columns=feature_names, fill_value=0)
        return X, feature_names
    return X, list(X.columns)


def compute_org_baselines(
    opportunities: pd.DataFrame,
) -> dict[str, dict[str, float]]:
    """Calcula baselines por org: median_cycle, win_rate, proposal_stagnation_rate."""
    baselines: dict[str, dict[str, float]] = {}
    for org_id, grp in opportunities.groupby("org_id"):
        won = grp[grp["status"] == "won"]
        lost = grp[grp["status"] == "lost"]
        open_df = grp[grp["status"] == "open"]
        total_closed = len(won) + len(lost)
        win_rate = len(won) / total_closed if total_closed > 0 else 0.3

        cycles = []
        for _, r in pd.concat([won, lost]).iterrows():
            cd = r.get("closed_date")
            cr = r.get("created_date")
            if cd and cr:
                d = _days_between(str(cr), str(cd))
                if d is not None and d >= 0:
                    cycles.append(d)
        median_cycle = float(np.median(cycles)) if cycles else 30.0

        proposta = open_df[
            open_df["stage_name"]
            .fillna("")
            .str.lower()
            .str.contains("proposta", na=False)
        ]
        total_prop = len(proposta)
        stagnated = total_prop  # placeholder; em prod viria de activity
        stagnation_rate = stagnated / total_prop if total_prop > 0 else 0.2

        baselines[str(org_id)] = {
            "median_cycle_org": median_cycle,
            "win_rate_org": win_rate,
            "proposal_stagnation_rate_org": stagnation_rate,
        }
    return baselines


def compute_seller_stats(
    opportunities: pd.DataFrame,
) -> dict[str, dict[str, float]]:
    """Calcula win_rate_seller e avg_cycle_seller por owner (hash)."""
    stats: dict[str, dict[str, float]] = {}
    owner_col = (
        opportunities["owner_name"]
        .fillna(opportunities["owner_email"])
        .fillna("unknown")
    )
    for owner, grp in opportunities.groupby(owner_col):
        h = _hash_seller(str(owner))
        won = grp[grp["status"] == "won"]
        lost = grp[grp["status"] == "lost"]
        total = len(won) + len(lost)
        win_rate = len(won) / total if total > 0 else 0.3
        cycles = []
        for _, r in pd.concat([won, lost]).iterrows():
            d = _days_between(
                str(r.get("created_date", "")),
                str(r.get("closed_date", "")),
            )
            if d is not None and d >= 0:
                cycles.append(d)
        avg_cycle = float(np.mean(cycles)) if cycles else 30.0
        stats[h] = {"win_rate_seller": win_rate, "avg_cycle_seller": avg_cycle}
    return stats
