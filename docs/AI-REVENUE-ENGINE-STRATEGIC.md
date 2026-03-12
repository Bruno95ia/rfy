# Revenue Engine AI — Diferencial Estratégico

## Como o modelo melhora com mais dados

1. **Split temporal**: O treino usa split temporal (últimos 20% para validação), evitando leakage e garantindo que o modelo generalize para o futuro.
2. **Features ricas**: Com mais oportunidades e atividades, `seller_win_rate`, `org_win_rate`, `deviation_vs_cluster_cycle` e `stage_position_percentage` tornam-se mais representativas.
3. **Registro de métricas**: Cada run grava AUC, Precision@K, Recall e MAE em `training_logs`, permitindo monitorar evolução ao longo do tempo.
4. **Re-treino periódico**: Endpoint `POST /train` pode ser disparado via cron (ex: semanalmente) para incorporar novos deals won/lost e refinar P(win).

## Como o cluster cria moat competitivo

1. **Benchmark contextualizado**: Empresas são clusterizadas por `ticket_median`, `cycle_median`, `sellers_count`, `revenue_band` e `segment`. A comparação é sempre com pares realmente similares.
2. **k-anonymity >= 5**: Nunca expõe dados individuais; apenas agregados. Isso permite benchmark entre concorrentes sem violar privacidade.
3. **Percentil e gaps**: `percentile_cycle`, `cycle_vs_cluster`, `winrate_vs_cluster` permitem que o cliente veja onde está no ranking do segmento.
4. **Acúmulo de dados**: Quanto mais organizações usam o sistema, mais clusters representativos e benchmarks precisos.

## Como o forecast por IA supera CRM tradicional

1. **P(win) real**: O LightGBM aprende padrões históricos (etapa, dias parados, atividade, performance do vendedor) em vez de regras fixas.
2. **Forecast ajustado**: `Σ(value × P(win))` é matematicamente superior à soma bruta do pipeline, que ignora probabilidade de fechamento.
3. **Breakdown por etapa**: O usuário vê quanto do forecast vem de cada etapa, permitindo priorização.
4. **Diferença percentual**: A `diferença_percentual` entre pipeline bruto e forecast ajustado quantifica o “otimismo” do pipeline.

## Motor de intervenções: priorização por impacto financeiro

O endpoint `POST /predict/interventions` ordena intervenções por **Impact Score**, priorizando ações com maior impacto financeiro em vendas complexas:

1. **Valor em risco**: `value × (1 - P(win))` — quanto maior o valor e menor a probabilidade de fechamento, mais vale intervir.
2. **Urgência**: fator `urgency(dias_sem_atividade)` cresce de forma logarítmica (`1 + log2(1 + d/7)`, teto 3.0), evitando que apenas “muito tempo parado” domine o ranking e equilibrando reativação de deals ainda recuperáveis.
3. **Peso de etapa**: etapas mais avançadas (proposta 1.5, aprovação 1.3, negociação 1.1, etc.) têm peso maior — perder um deal em proposta custa mais que um em lead.

**Fórmula**: `Impact Score = value × (1 - P(win)) × urgency(days_wo) × stage_weight`  
A resposta inclui `p_win`, `impact_rationale` e `recommended_action` por deal para explicabilidade no painel.

## Como isso vira infraestrutura de inteligência

1. **Versionamento**: Modelos salvos em `/artifacts` e registrados em `model_versions` e opcionalmente no MLflow.
2. **API padronizada**: Endpoints `POST /predict/deal`, `POST /predict/forecast`, `POST /benchmark/company`, `POST /predict/interventions` são estáveis e documentados.
3. **Integração Next.js**: O `aiClient.ts` e as rotas `/api/ai/*` fazem o dashboard consumir IA real em produção.
4. **Treino on-demand**: `POST /train` permite re-treino sob demanda ou via cron, sem deploy de código.

## Execução e validação

```bash
# Subir stack completa
docker compose up --build

# Treinar modelos (após dados no Postgres)
curl -X POST http://localhost:8001/train

# Predições
curl -X POST http://localhost:8001/predict/deal -H "Content-Type: application/json" \
  -d '{"deal_id":"<uuid>","org_id":"<uuid>"}'
curl -X POST http://localhost:8001/predict/forecast -H "Content-Type: application/json" \
  -d '{"org_id":"<uuid>"}'
curl -X POST http://localhost:8001/benchmark/company -H "Content-Type: application/json" \
  -d '{"org_id":"<uuid>"}'
curl -X POST http://localhost:8001/predict/interventions -H "Content-Type: application/json" \
  -d '{"org_id":"<uuid>"}'
```

## Migrations a aplicar

1. `003_ai_benchmark_tables.sql` — org_profiles, org_cluster, benchmark_cluster_stats, model_versions
2. `004_training_logs.sql` — training_logs

Execute no Supabase SQL Editor ou via `psql` na connection string do projeto.
