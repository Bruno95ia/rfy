"""Testes para feature_builder."""
import pandas as pd
import numpy as np
import pytest

from feature_builder import (
    build_deal_features,
    encode_features_for_model,
    compute_org_baselines,
    compute_seller_stats,
    _hash_seller,
)


def test_hash_seller_deterministic():
    assert _hash_seller("a@b.com") == _hash_seller("a@b.com")
    assert _hash_seller(None) == "unknown"
    assert _hash_seller(np.nan) == "unknown"
    assert len(_hash_seller("x")) == 12


def test_encode_features_for_model():
    df = pd.DataFrame({
        "stage_name": ["Proposta", "Negociação", "Proposta"],
        "days_without_activity": [5, 10, 0],
        "age_days": [10, 20, 5],
        "value": [1000, 2000, 500],
        "stage_timing_days": [2, 5, 1],
        "activity_count_last_7": [1, 0, 2],
        "activity_count_last_14": [2, 1, 3],
        "activity_count_last_30": [3, 2, 5],
        "org_median_cycle": [30, 30, 30],
        "org_win_rate": [0.3, 0.3, 0.3],
        "org_proposal_stagnation_rate": [0.2, 0.2, 0.2],
        "seller_win_rate": [0.4, 0.35, 0.45],
        "seller_avg_cycle": [25, 28, 22],
        "deviation_vs_org_cycle": [0, 0, 0],
        "deviation_vs_cluster_cycle": [0, 0, 0],
        "stage_position_percentage": [50, 40, 50],
    })
    X, names = encode_features_for_model(df)
    assert len(names) > 0
    assert X.shape[0] == 3
    assert "days_without_activity" in names
    assert "value" in names


def test_build_deal_features_empty_activities():
    opp_df = pd.DataFrame([{
        "id": "d1",
        "org_id": "o1",
        "crm_hash": "h1",
        "stage_name": "Proposta",
        "status": "open",
        "value": 1000,
        "created_date": "2024-01-01",
        "closed_date": None,
        "owner_email": "a@b.com",
        "owner_name": "Alice",
        "stage_timing_days": 2,
    }])
    features = build_deal_features(
        opp_df,
        {},
        {"o1": {"median_cycle_org": 30, "win_rate_org": 0.3, "proposal_stagnation_rate_org": 0.2}},
        {"abc123": {"win_rate_seller": 0.4, "avg_cycle_seller": 25}},
    )
    assert len(features) == 1
    assert features.iloc[0]["days_without_activity"] >= 0
    assert features.iloc[0]["value"] == 1000
    assert "activity_count_last_7" in features.columns


def test_compute_org_baselines_empty():
    df = pd.DataFrame(columns=["org_id", "status", "stage_name", "closed_date", "created_date"])
    b = compute_org_baselines(df)
    assert b == {}


def test_compute_seller_stats():
    df = pd.DataFrame([
        {"owner_email": "a@b.com", "owner_name": None, "status": "won", "created_date": "2024-01-01", "closed_date": "2024-01-15"},
        {"owner_email": "a@b.com", "owner_name": None, "status": "lost", "created_date": "2024-01-02", "closed_date": "2024-01-20"},
    ])
    stats = compute_seller_stats(df)
    assert len(stats) >= 1
    for v in stats.values():
        assert "win_rate_seller" in v
        assert "avg_cycle_seller" in v
