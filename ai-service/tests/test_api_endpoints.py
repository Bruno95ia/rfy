"""Testes de integração dos endpoints principais do AI Service."""
import pytest
from unittest.mock import patch, MagicMock
from contextlib import contextmanager

import pandas as pd
from fastapi.testclient import TestClient


# Context manager que simula load_org_data
@contextmanager
def _mock_load_org_data(org_id=None):
    """Retorna DataFrames vazios/minimos para evitar queries ao DB."""
    opp = pd.DataFrame(columns=[
        "id", "org_id", "crm_hash", "stage_name", "status", "value",
        "company_name", "created_date", "closed_date", "owner_email",
        "owner_name", "stage_timing_days",
    ])
    yield opp, {}


def _mock_load_all_opportunities():
    return pd.DataFrame(columns=[
        "id", "org_id", "crm_hash", "stage_name", "status", "value",
        "company_name", "created_date", "closed_date", "owner_email",
        "owner_name", "stage_timing_days",
    ])


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


def test_health(client):
    """GET /health retorna 200 e status ok."""
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


def test_train_without_secret_allows_access(client):
    """POST /train sem AI_TRAIN_SECRET configurado permite acesso (dev)."""
    with patch("main.train", return_value={"auc": 0.8, "n_train": 10}):
        r = client.post("/train")
        assert r.status_code == 200
        assert "auc" in r.json()


def test_train_with_secret_denies_without_header(client):
    """POST /train com AI_TRAIN_SECRET exige header X-Train-API-Key."""
    with patch("main.get_settings") as mock_gs:
        s = MagicMock()
        s.train_secret = "secret123"
        mock_gs.return_value = s
        r = client.post("/train")
        assert r.status_code == 403
        assert "Acesso negado" in r.json().get("detail", "")


def test_predict_forecast_with_mocked_db(client):
    """POST /predict/forecast retorna estrutura válida com dados mockados."""
    with patch("main.load_org_data", side_effect=lambda org_id=None: _mock_load_org_data(org_id)):
        r = client.post("/predict/forecast", json={"org_id": "org1"})
        assert r.status_code == 200
        data = r.json()
        assert "forecast_adjusted" in data or "pipeline_bruto" in data or "n_deals" in data


def test_benchmark_company_no_data(client):
    """POST /benchmark/company com DB vazio retorna no_data."""
    with patch("main.load_all_opportunities", side_effect=_mock_load_all_opportunities):
        r = client.post("/benchmark/company", json={"org_id": "org1"})
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "no_data"
