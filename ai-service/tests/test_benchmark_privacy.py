"""Testes para privacy do benchmark (k-anonymity)."""
import pandas as pd
import pytest

from benchmark import (
    check_k_anonymity,
    get_benchmark_for_org,
    assign_clusters,
    compute_cluster_stats,
)


def test_check_k_anonymity():
    assert check_k_anonymity(5) is True
    assert check_k_anonymity(6) is True
    assert check_k_anonymity(4) is False
    assert check_k_anonymity(0) is False


def test_get_benchmark_insufficient_peers():
    """Cluster com < K orgs deve retornar insufficient_peers."""
    org_id = "o1"
    org_metrics = {"cycle_median": 30, "win_rate": 0.3}
    cluster_stats = {
        0: {
            "cycle_median": {"p25": 25, "median": 30, "p75": 35, "n_orgs": 3},  # n_orgs < 5
        }
    }
    org_to_cluster = {"o1": 0}
    result = get_benchmark_for_org(org_id, org_metrics, cluster_stats, org_to_cluster)
    assert result["status"] == "insufficient_peers"


def test_get_benchmark_ok():
    """Cluster com >= K orgs deve retornar diffs."""
    org_id = "o1"
    org_metrics = {"cycle_median": 30, "win_rate": 0.35}
    cluster_stats = {
        0: {
            "cycle_median": {"p25": 25, "median": 30, "p75": 35, "n_orgs": 10},
            "win_rate": {"p25": 0.25, "median": 0.30, "p75": 0.40, "n_orgs": 10},
        }
    }
    org_to_cluster = {"o1": 0}
    result = get_benchmark_for_org(org_id, org_metrics, cluster_stats, org_to_cluster)
    assert result["status"] == "ok"
    assert "diffs" in result
    assert "cycle_median" in result["diffs"]
    assert result["diffs"]["cycle_median"]["n_orgs"] >= 5
    assert result["diffs"]["win_rate"]["pct_diff_vs_median"] > 0  # 0.35 vs 0.30


def test_get_benchmark_no_cluster():
    """Org sem cluster atribuído."""
    result = get_benchmark_for_org("o_unknown", {}, {}, {})
    assert result["status"] == "no_cluster"


def test_assign_clusters_empty():
    df = pd.DataFrame(columns=["org_id", "ticket_median", "cycle_median"])
    m = assign_clusters(df)
    assert m == {}


def test_assign_clusters_single():
    df = pd.DataFrame([{"org_id": "o1", "ticket_median": 10, "cycle_median": 30}])
    m = assign_clusters(df)
    assert m["o1"] == 0


def test_compute_cluster_stats_respects_k():
    """Stats só devem existir para clusters com n_orgs >= K."""
    df = pd.DataFrame([
        {"org_id": "o1", "cycle_median": 30, "win_rate": 0.3},
        {"org_id": "o2", "cycle_median": 35, "win_rate": 0.35},
        {"org_id": "o3", "cycle_median": 25, "win_rate": 0.25},
        {"org_id": "o4", "cycle_median": 32, "win_rate": 0.32},
        {"org_id": "o5", "cycle_median": 28, "win_rate": 0.28},
    ])
    org_to_cluster = {"o1": 0, "o2": 0, "o3": 0, "o4": 0, "o5": 0}
    stats = compute_cluster_stats(df, org_to_cluster)
    assert 0 in stats
    assert "cycle_median" in stats[0]
    assert stats[0]["cycle_median"]["n_orgs"] == 5
