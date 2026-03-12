# IA + Benchmark — Cloud Privada

Este documento descreve a camada de IA real e benchmarking do Revenue Engine, preparada para cloud privada via Docker Compose.

## Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   AI Service    │────▶│    Postgres     │
│   (port 3000)   │     │   (port 8001)   │     │   (port 5432)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        │  /api/ai/forecast      │  /predict/forecast
        │  /api/ai/benchmark     │  /benchmark/company
        └────────────────────────┘
```

## Endpoints do AI Service

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/health` | GET | Health check |
| `/predict/deal` | POST | P(win), risk_delay, expected_close_days por deal |
| `/predict/forecast` | POST | Forecast ajustado Σ(value × P(win)) por org |
| `/benchmark/company` | POST | Comparação vs cluster (k-anonimizado) |
| `/train` | POST | Dispara treinamento do modelo |
| `/models` | GET | Lista versões de modelos |

## Docker Compose

### Iniciar todos os serviços

```bash
docker compose up --build
```

### Variáveis de ambiente

Crie `.env` na raiz do projeto (ou exporte):

```env
# Supabase (para auth/storage – se usar Supabase em vez de Postgres local)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Postgres local (se usar postgres do compose)
POSTGRES_PASSWORD=postgres

# Database para o app e AI (se usar Postgres local)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres
AI_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres
```

### Rodar treinamento manualmente

```bash
# Com o ai-service rodando
curl -X POST http://localhost:8001/train

# Ou dentro do container
docker compose exec ai-service curl -X POST http://localhost:8001/train
```

Ou via Python:

```bash
cd ai-service
python -c "from trainer import train; print(train())"
```

## Migrações SQL

Execute no Supabase SQL Editor ou no Postgres local:

```bash
psql $DATABASE_URL -f supabase/sql/migrations/003_ai_benchmark_tables.sql
```

## Desenvolvimento local (sem Docker)

1. **Postgres**: Use Supabase ou Postgres local.

2. **AI Service**:

```bash
cd ai-service
pip install -r requirements.txt
export AI_DATABASE_URL="postgresql://user:pass@host:5432/db"
export AI_ARTIFACTS_PATH="./artifacts"
mkdir -p artifacts
uvicorn main:app --reload --port 8001
```

3. **Next.js**:

```bash
export AI_SERVICE_URL=http://localhost:8001
npm run dev
```

O dashboard chamará `/api/ai/forecast` e `/api/ai/benchmark`, que fazem proxy para o ai-service.

## Privacidade (Benchmark)

- **k-anonymity**: Só exibe stats de cluster se `n_orgs >= 5` (configurável via `AI_K_ANONYMITY`).
- Dados agregados: mediana, P25, P75 por métrica.
- Nenhum nome de empresa ou deal individual no benchmark.

## Cluster e métricas

Cluster definido por:
- ticket_median, cycle_median
- sellers_count
- revenue_band, segment (quando disponíveis)

Métricas de benchmark:
- cycle_median
- win_rate
- proposal_stagnation_rate
- abandoned_rate
- pipeline_value_open

## “Momento uau” Head/CEO

> "Você está X% pior/melhor que empresas do seu cluster em:
> - ciclo
> - proposta
> - estagnação
> - win rate
> - forecast ajustado"

O card **Vs seu cluster** no dashboard exibe essa comparação quando há pares suficientes no cluster.
