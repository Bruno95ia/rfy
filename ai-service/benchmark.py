"""
Engine de clustering (KMeans) e benchmarks por cluster.
Implementa k-anonymity (>=5) para privacidade. Nunca expõe dados individuais.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from config import get_settings

K_ANON = get_settings().k_anonymity


def _format_pct_diff(pct: float) -> str:
    """Formata diferença percentual como '+18%' ou '-9%'."""
    sign = "+" if pct >= 0 else ""
    return f"{sign}{round(pct, 1)}%"


def _percentile_rank(
    value: float, values: np.ndarray | pd.Series
) -> int:
    """
    Retorna percentil (0-100) em que value está na distribuição.
    Ex: percentile_cycle=72 significa ciclo melhor que 72% do cluster.
    """
    if len(values) == 0:
        return 50
    vals = np.asarray(values)
    return int(np.clip(np.mean(vals <= value) * 100, 0, 100))


def build_org_profile(org_metrics: dict[str, Any]) -> dict[str, float]:
    """Extrai features numéricas para clustering de org."""
    return {
        "ticket_median": float(org_metrics.get("ticket_median", 0) or 0),
        "cycle_median": float(org_metrics.get("cycle_median", 30) or 30),
        "sellers_count": float(org_metrics.get("sellers_count", 1) or 1),
        "revenue_band_encoded": float(org_metrics.get("revenue_band_encoded", 0) or 0),
        "segment_encoded": float(org_metrics.get("segment_encoded", 0) or 0),
    }


def assign_clusters(
    org_profiles: pd.DataFrame,
    n_clusters: int | None = None,
) -> dict[str, int]:
    """
    Atribui cluster_id por org_id usando KMeans.
    org_profiles: DataFrame com org_id e colunas numéricas.
    """
    if org_profiles.empty:
        return {}
    if len(org_profiles) < 2:
        return {str(org_profiles.iloc[0]["org_id"]): 0}

    feature_cols = [
        c
        for c in org_profiles.columns
        if c != "org_id" and pd.api.types.is_numeric_dtype(org_profiles[c])
    ]
    if not feature_cols:
        return {str(row["org_id"]): 0 for _, row in org_profiles.iterrows()}

    X = org_profiles[feature_cols].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k = n_clusters or min(5, max(2, len(org_profiles) // 3))
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)

    return {
        str(row["org_id"]): int(labels[i])
        for i, (_, row) in enumerate(org_profiles.iterrows())
    }


def _invert_mapping(m: dict[str, int]) -> dict[int, list[str]]:
    out: dict[int, list[str]] = {}
    for k, v in m.items():
        if v not in out:
            out[v] = []
        out[v].append(k)
    return out


def compute_cluster_stats(
    org_metrics_df: pd.DataFrame,
    org_to_cluster: dict[str, int],
) -> dict[int, dict[str, dict[str, float]]]:
    """
    Calcula p25, median, p75 por cluster e por métrica.
    Aplica k-anonymity: não inclui clusters com n_orgs < K.
    """
    metrics = [
        "cycle_median",
        "win_rate",
        "proposal_stagnation_rate",
        "abandoned_rate",
        "pipeline_value_open",
    ]
    result: dict[int, dict[str, dict[str, float]]] = {}

    for cluster_id, org_ids in _invert_mapping(org_to_cluster).items():
        subset = org_metrics_df[
            org_metrics_df["org_id"].astype(str).isin(org_ids)
        ]
        if len(subset) < K_ANON:
            continue
        result[cluster_id] = {}
        for m in metrics:
            if m not in subset.columns:
                continue
            vals = subset[m].dropna()
            if len(vals) < K_ANON:
                continue
            result[cluster_id][m] = {
                "p25": float(np.percentile(vals, 25)),
                "median": float(np.median(vals)),
                "p75": float(np.percentile(vals, 75)),
                "n_orgs": len(subset),
                "values": vals.values,  # para percentile_rank
            }
    return result


def get_benchmark_for_org(
    org_id: str,
    org_metrics: dict[str, float],
    cluster_stats: dict[int, dict[str, dict[str, float]]],
    org_to_cluster: dict[str, int],
) -> dict[str, Any]:
    """
    Retorna benchmark vs cluster para uma org.
    k-anonymity: só retorna se n_orgs >= 5.
    Formato: cycle_vs_cluster, winrate_vs_cluster, proposal_delay_vs_cluster,
    percentile_cycle + diffs detalhados para UI.
    """
    cluster_id = org_to_cluster.get(org_id)
    if cluster_id is None:
        return {"status": "no_cluster", "message": "Org não atribuída a cluster"}

    stats = cluster_stats.get(cluster_id)
    if not stats:
        return {
            "status": "insufficient_peers",
            "message": f"Cluster com menos de {K_ANON} empresas",
        }

    diffs: dict[str, dict[str, Any]] = {}
    cycle_vs_cluster = None
    winrate_vs_cluster = None
    proposal_delay_vs_cluster = None
    percentile_cycle = 50

    for metric, cluster_vals in stats.items():
        if "n_orgs" in metric:
            continue
        org_val = org_metrics.get(metric)
        if org_val is None:
            continue
        n_orgs = cluster_vals.get("n_orgs", 0)
        if n_orgs < K_ANON:
            return {
                "status": "insufficient_peers",
                "message": f"Menos de {K_ANON} empresas no cluster",
            }

        p25 = cluster_vals["p25"]
        med = cluster_vals["median"]
        p75 = cluster_vals["p75"]
        vals = cluster_vals.get("values", np.array([med]))
        cluster_vals_clean = {k: v for k, v in cluster_vals.items() if k != "values"}

        pct_diff = ((org_val - med) / med * 100) if med != 0 else 0
        percentile = _percentile_rank(org_val, vals)
        if metric == "cycle_median":
            percentile_cycle = percentile
            cycle_vs_cluster = _format_pct_diff(pct_diff)
        elif metric == "win_rate":
            winrate_vs_cluster = _format_pct_diff(pct_diff)
        elif metric == "proposal_stagnation_rate":
            proposal_delay_vs_cluster = _format_pct_diff(pct_diff)

        diffs[metric] = {
            "org_value": org_val,
            "cluster_median": med,
            "cluster_p25": p25,
            "cluster_p75": p75,
            "pct_diff_vs_median": round(pct_diff, 2),
            "percentile": "below"
            if org_val <= p25
            else ("above" if org_val >= p75 else "at"),
            "n_orgs": n_orgs,
        }

    return {
        "status": "ok",
        "cluster_id": cluster_id,
        "cycle_vs_cluster": cycle_vs_cluster or "0%",
        "winrate_vs_cluster": winrate_vs_cluster or "0%",
        "proposal_delay_vs_cluster": proposal_delay_vs_cluster or "0%",
        "percentile_cycle": percentile_cycle,
        "diffs": diffs,
    }


def check_k_anonymity(n_orgs: int) -> bool:
    """Retorna True se n_orgs >= K."""
    return n_orgs >= K_ANON
