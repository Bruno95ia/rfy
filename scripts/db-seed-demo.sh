#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/postgres}"

DEFAULT_ORG_ID="8c2f64ad-0fe8-4a52-a01f-2f4a64796f01"
DEFAULT_USER_ID="11111111-1111-1111-1111-111111111111"

DEMO_ORG_NAME="${DEMO_ORG_NAME:-RFY Demo SaaS}"
DEMO_PLAN_ID="${DEMO_PLAN_ID:-pro}"
DEMO_USER_ID="${DEMO_USER_ID:-}"
DEMO_ORG_ID="${DEMO_ORG_ID:-}"

if [[ -z "$DEMO_USER_ID" ]]; then
  DEMO_USER_ID="$DEFAULT_USER_ID"
fi

if [[ -z "$DEMO_ORG_ID" ]]; then
  DEMO_ORG_ID="$DEFAULT_ORG_ID"
fi

PSQL_MODE=""
if command -v psql >/dev/null 2>&1; then
  PSQL_MODE="host"
elif command -v docker >/dev/null 2>&1; then
  # Garante que o container postgres está rodando; sobe se necessário
  DOCKER_POSTGRES_STARTED=""
  if ! docker compose exec -T postgres pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    echo "==> Subindo Postgres (Docker)..."
    if docker compose up -d postgres 2>/dev/null; then
      DOCKER_POSTGRES_STARTED=1
    fi
    echo "==> Aguardando Postgres ficar saudável..."
    for i in 1 2 3 4 5 6 7 8 9 10 11 12 15 20; do
      if docker compose exec -T postgres pg_isready -U postgres -d postgres >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  fi
  if docker compose exec -T postgres pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    PSQL_MODE="docker"
  fi
  export DOCKER_POSTGRES_STARTED
fi

if [[ -z "$PSQL_MODE" ]]; then
  # Fallback: Node conectando no Postgres em localhost (Docker)
  if command -v node >/dev/null 2>&1 && [[ -f "$(dirname "$0")/db-seed-demo-node.js" ]]; then
    [[ -f .env.local ]] && set -a && source .env.local 2>/dev/null && set +a
    # Força localhost na mesma linha do exec para não ser sobrescrito pelo .env.local
    exec env DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD:-postgres}@localhost:5432/postgres" node "$(dirname "$0")/db-seed-demo-node.js"
  fi
  echo "Erro: nem psql local nem docker compose para postgres estão disponíveis."
  echo "  Suba o Postgres: docker compose up -d postgres"
  echo "  Ou defina DATABASE_URL no .env.local e use Node para o seed."
  exit 1
fi

run_psql() {
  if [[ "$PSQL_MODE" == "host" ]]; then
    psql "$DATABASE_URL" "$@"
    return
  fi
  docker compose exec -T postgres psql -U postgres -d postgres "$@"
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

query_value() {
  run_psql -At -v ON_ERROR_STOP=1 -c "$1" | tr -d '[:space:]'
}

if [[ "$DEMO_USER_ID" == "$DEFAULT_USER_ID" ]]; then
  discovered_user="$(query_value "SELECT user_id::text FROM org_members ORDER BY created_at DESC NULLS LAST LIMIT 1;")"
  if [[ -n "$discovered_user" ]]; then
    DEMO_USER_ID="$discovered_user"
  fi
fi

if [[ "$DEMO_ORG_ID" == "$DEFAULT_ORG_ID" ]]; then
  discovered_org="$(query_value "SELECT org_id::text FROM org_members WHERE user_id = '$(sql_escape "$DEMO_USER_ID")'::uuid ORDER BY created_at DESC NULLS LAST LIMIT 1;")"
  if [[ -n "$discovered_org" ]]; then
    DEMO_ORG_ID="$discovered_org"
  fi
fi

ORG_ID_SQL="$(sql_escape "$DEMO_ORG_ID")"
USER_ID_SQL="$(sql_escape "$DEMO_USER_ID")"
ORG_NAME_SQL="$(sql_escape "$DEMO_ORG_NAME")"
PLAN_ID_SQL="$(sql_escape "$DEMO_PLAN_ID")"

if [[ "$DEMO_USER_ID" == "$DEFAULT_USER_ID" ]]; then
  echo "⚠ Nenhum usuário autenticado encontrado em org_members."
  echo "  Use DEMO_USER_ID=<uuid-do-auth-user> para vincular o seed ao seu login."
fi

echo "==> Seed demo"
echo "   org_id:   $DEMO_ORG_ID"
echo "   user_id:  $DEMO_USER_ID"
echo "   org_name: $DEMO_ORG_NAME"
echo "   plan_id:  $DEMO_PLAN_ID"

run_psql -v ON_ERROR_STOP=1 <<SQL
BEGIN;

INSERT INTO orgs(id, name)
VALUES ('$ORG_ID_SQL'::uuid, '$ORG_NAME_SQL')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO org_members(org_id, user_id, role)
VALUES ('$ORG_ID_SQL'::uuid, '$USER_ID_SQL'::uuid, 'owner')
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = 'owner';

INSERT INTO org_subscriptions(org_id, plan_id, status, period_start, updated_at)
VALUES ('$ORG_ID_SQL'::uuid, '$PLAN_ID_SQL', 'active', now() - interval '7 days', now())
ON CONFLICT (org_id) DO UPDATE
SET plan_id = EXCLUDED.plan_id,
    status = 'active',
    updated_at = now();

INSERT INTO usage_limits(org_id, seats_limit, uploads_limit_30d, active_deals_limit, updated_at)
VALUES ('$ORG_ID_SQL'::uuid, 25, 800, 5000, now())
ON CONFLICT (org_id) DO UPDATE
SET seats_limit = EXCLUDED.seats_limit,
    uploads_limit_30d = EXCLUDED.uploads_limit_30d,
    active_deals_limit = EXCLUDED.active_deals_limit,
    updated_at = now();

INSERT INTO org_config(
  org_id,
  org_display_name,
  dias_proposta_risco,
  dias_pipeline_abandonado,
  dias_aging_inflado,
  dias_aprovacao_travada,
  notificar_email,
  email_notificacoes,
  incluir_convite_calendario,
  top_deals_por_friccao,
  top_evidencias_por_friccao,
  timezone,
  cac_manual,
  marketing_spend_monthly,
  updated_at
)
VALUES (
  '$ORG_ID_SQL'::uuid,
  '$ORG_NAME_SQL',
  7,
  14,
  60,
  5,
  true,
  'alerts-demo@rfy.local',
  true,
  20,
  10,
  'America/Sao_Paulo',
  2100,
  18000,
  now()
)
ON CONFLICT (org_id) DO UPDATE
SET org_display_name = EXCLUDED.org_display_name,
    dias_proposta_risco = EXCLUDED.dias_proposta_risco,
    dias_pipeline_abandonado = EXCLUDED.dias_pipeline_abandonado,
    dias_aging_inflado = EXCLUDED.dias_aging_inflado,
    dias_aprovacao_travada = EXCLUDED.dias_aprovacao_travada,
    notificar_email = EXCLUDED.notificar_email,
    email_notificacoes = EXCLUDED.email_notificacoes,
    incluir_convite_calendario = EXCLUDED.incluir_convite_calendario,
    top_deals_por_friccao = EXCLUDED.top_deals_por_friccao,
    top_evidencias_por_friccao = EXCLUDED.top_evidencias_por_friccao,
    timezone = EXCLUDED.timezone,
    cac_manual = EXCLUDED.cac_manual,
    marketing_spend_monthly = EXCLUDED.marketing_spend_monthly,
    updated_at = now();

INSERT INTO crm_integrations(
  org_id,
  provider,
  api_url,
  webhook_secret,
  webhook_enabled,
  field_mapping_json,
  last_sync_at,
  last_sync_status,
  is_active,
  updated_at
)
VALUES (
  '$ORG_ID_SQL'::uuid,
  'n8n_webhook',
  'https://n8n.local/webhook/rfy',
  'demo-webhook-secret',
  true,
  '{"seed":"demo_v1"}'::jsonb,
  now() - interval '35 minutes',
  'success',
  true,
  now()
)
ON CONFLICT (org_id, provider) DO UPDATE
SET api_url = EXCLUDED.api_url,
    webhook_secret = EXCLUDED.webhook_secret,
    webhook_enabled = EXCLUDED.webhook_enabled,
    field_mapping_json = EXCLUDED.field_mapping_json,
    last_sync_at = EXCLUDED.last_sync_at,
    last_sync_status = EXCLUDED.last_sync_status,
    is_active = EXCLUDED.is_active,
    updated_at = now();

INSERT INTO uploads(id, org_id, filename, storage_path, kind, status, created_at, processed_at)
VALUES
  ('a7f6c321-6f8b-43ba-9519-111111111111'::uuid, '$ORG_ID_SQL'::uuid, 'demo-opportunities.csv', 'demo/opportunities.csv', 'opportunities', 'done', now() - interval '2 days', now() - interval '2 days'),
  ('a7f6c321-6f8b-43ba-9519-222222222222'::uuid, '$ORG_ID_SQL'::uuid, 'demo-activities.csv', 'demo/activities.csv', 'activities', 'done', now() - interval '1 day', now() - interval '1 day')
ON CONFLICT (id) DO UPDATE
SET filename = EXCLUDED.filename,
    storage_path = EXCLUDED.storage_path,
    kind = EXCLUDED.kind,
    status = EXCLUDED.status,
    processed_at = EXCLUDED.processed_at;

INSERT INTO opportunities(
  org_id,
  upload_id,
  crm_source,
  crm_hash,
  pipeline_name,
  stage_name,
  stage_timing_days,
  owner_email,
  owner_name,
  company_name,
  title,
  value,
  created_date,
  status
)
VALUES
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-111111111111'::uuid, 'piperun', 'demo-opp-001', 'Enterprise', 'Proposta', 19, 'ana@rfy.local', 'Ana Clara', 'Atlas Energia', 'Expansao Nacional', 420000, current_date - 60, 'open'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-111111111111'::uuid, 'piperun', 'demo-opp-002', 'Enterprise', 'Proposta', 16, 'ana@rfy.local', 'Ana Clara', 'Norte Pharma', 'Plataforma Comercial', 280000, current_date - 45, 'open'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-111111111111'::uuid, 'piperun', 'demo-opp-003', 'Mid-Market', 'Negociacao', 11, 'bruno@rfy.local', 'Bruno Lima', 'Sigma Log', 'Rollout Filiais', 360000, current_date - 34, 'open'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-111111111111'::uuid, 'piperun', 'demo-opp-004', 'Mid-Market', 'Negociacao', 8, 'carla@rfy.local', 'Carla Souza', 'Delta Foods', 'Otimizacao RevenueOps', 240000, current_date - 29, 'open'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-111111111111'::uuid, 'piperun', 'demo-opp-005', 'SMB', 'Qualificacao', 6, 'carla@rfy.local', 'Carla Souza', 'Zen Motors', 'Expansao Inside Sales', 130000, current_date - 20, 'open'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-111111111111'::uuid, 'piperun', 'demo-opp-006', 'SMB', 'Fechado', 2, 'bruno@rfy.local', 'Bruno Lima', 'Kappa Medical', 'Renovacao Contrato', 175000, current_date - 15, 'won')
ON CONFLICT (org_id, crm_hash) DO UPDATE
SET stage_name = EXCLUDED.stage_name,
    stage_timing_days = EXCLUDED.stage_timing_days,
    owner_email = EXCLUDED.owner_email,
    owner_name = EXCLUDED.owner_name,
    company_name = EXCLUDED.company_name,
    title = EXCLUDED.title,
    value = EXCLUDED.value,
    created_date = EXCLUDED.created_date,
    status = EXCLUDED.status,
    upload_id = EXCLUDED.upload_id;

DELETE FROM activities
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND title LIKE '[DEMO] %';

INSERT INTO activities(
  org_id,
  upload_id,
  crm_activity_id,
  type,
  title,
  owner,
  done_at,
  opportunity_id_crm,
  company_name,
  opportunity_title,
  opportunity_owner_name,
  linked_opportunity_hash,
  link_confidence
)
VALUES
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-222222222222'::uuid, 'demo-act-001', 'call', '[DEMO] Follow-up Proposta Atlas', 'Ana Clara', now() - interval '3 days', null, 'Atlas Energia', 'Expansao Nacional', 'Ana Clara', 'demo-opp-001', 'high'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-222222222222'::uuid, 'demo-act-002', 'email', '[DEMO] Reengajar Norte Pharma', 'Ana Clara', now() - interval '7 days', null, 'Norte Pharma', 'Plataforma Comercial', 'Ana Clara', 'demo-opp-002', 'high'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-222222222222'::uuid, 'demo-act-003', 'meeting', '[DEMO] Negociacao Sigma', 'Bruno Lima', now() - interval '4 days', null, 'Sigma Log', 'Rollout Filiais', 'Bruno Lima', 'demo-opp-003', 'high'),
  ('$ORG_ID_SQL'::uuid, 'a7f6c321-6f8b-43ba-9519-222222222222'::uuid, 'demo-act-004', 'task', '[DEMO] Proposta Delta', 'Carla Souza', now() - interval '2 days', null, 'Delta Foods', 'Otimizacao RevenueOps', 'Carla Souza', 'demo-opp-004', 'high');

DELETE FROM org_icp_studies
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND model_used = 'seed-demo-v1';

INSERT INTO org_unit_economics(
  org_id,
  ltv_computed,
  churn_rate,
  win_rate,
  avg_deal_value,
  deals_won_count,
  deals_lost_count,
  deals_open_count,
  cac_manual,
  marketing_spend_monthly,
  ltv_cac_ratio,
  computed_at
)
VALUES (
  '$ORG_ID_SQL'::uuid,
  28600,
  0.029,
  0.34,
  267500,
  22,
  18,
  6,
  2100,
  18000,
  13.62,
  now()
)
ON CONFLICT (org_id) DO UPDATE
SET ltv_computed = EXCLUDED.ltv_computed,
    churn_rate = EXCLUDED.churn_rate,
    win_rate = EXCLUDED.win_rate,
    avg_deal_value = EXCLUDED.avg_deal_value,
    deals_won_count = EXCLUDED.deals_won_count,
    deals_lost_count = EXCLUDED.deals_lost_count,
    deals_open_count = EXCLUDED.deals_open_count,
    cac_manual = EXCLUDED.cac_manual,
    marketing_spend_monthly = EXCLUDED.marketing_spend_monthly,
    ltv_cac_ratio = EXCLUDED.ltv_cac_ratio,
    computed_at = now();

INSERT INTO org_icp_studies(org_id, icp_summary, icp_study_json, generated_at, model_used)
VALUES (
  '$ORG_ID_SQL'::uuid,
  'ICP dominante: SaaS B2B com 50-300 colaboradores, ciclo de 45-70 dias e ticket medio de 250 mil reais.',
  '{"best_segments":[{"segment":"SaaS B2B","win_rate":0.41},{"segment":"Servicos financeiros","win_rate":0.37}],"anti_patterns":["pipeline sem dono definido","falta de atividade nos ultimos 14 dias"]}'::jsonb,
  now(),
  'seed-demo-v1'
);

INSERT INTO org_onboarding_steps(org_id, step_key, completed_at, completed_by, metadata_json)
VALUES
  ('$ORG_ID_SQL'::uuid, 'connect_crm', now() - interval '5 days', '$USER_ID_SQL'::uuid, '{"seed":"demo_v1"}'::jsonb),
  ('$ORG_ID_SQL'::uuid, 'first_upload', now() - interval '4 days', '$USER_ID_SQL'::uuid, '{"seed":"demo_v1"}'::jsonb),
  ('$ORG_ID_SQL'::uuid, 'alerts_setup', now() - interval '3 days', '$USER_ID_SQL'::uuid, '{"seed":"demo_v1"}'::jsonb)
ON CONFLICT (org_id, step_key) DO UPDATE
SET completed_at = EXCLUDED.completed_at,
    completed_by = EXCLUDED.completed_by,
    metadata_json = EXCLUDED.metadata_json;

INSERT INTO org_api_keys(org_id, name, key_prefix, key_hash, scopes, created_by, last_used_at)
VALUES (
  '$ORG_ID_SQL'::uuid,
  '[DEMO] Ingest Key',
  'rfy_demo_',
  encode(digest('rfy-demo-key-$ORG_ID_SQL', 'sha256'), 'hex'),
  ARRAY['crm:ingest', 'reports:read']::text[],
  '$USER_ID_SQL'::uuid,
  now() - interval '1 day'
)
ON CONFLICT (key_hash) DO UPDATE
SET name = EXCLUDED.name,
    scopes = EXCLUDED.scopes,
    created_by = EXCLUDED.created_by,
    last_used_at = EXCLUDED.last_used_at,
    revoked_at = null;

DELETE FROM outbound_webhooks
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND name = '[DEMO] Revenue Alerts';

INSERT INTO outbound_webhooks(org_id, name, target_url, secret_encrypted, events, is_active, last_status, last_sent_at, updated_at)
VALUES (
  '$ORG_ID_SQL'::uuid,
  '[DEMO] Revenue Alerts',
  'https://hooks.demo.local/revenue-alerts',
  null,
  ARRAY['friction.created', 'report.generated']::text[],
  true,
  'sent',
  now() - interval '2 hours',
  now()
);

DELETE FROM alert_channels
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND target = 'alerts-demo@rfy.local';

INSERT INTO alert_channels(org_id, channel_type, target, config_json, is_active)
VALUES ('$ORG_ID_SQL'::uuid, 'email', 'alerts-demo@rfy.local', '{"seed":"demo_v1"}'::jsonb, true);

DELETE FROM alert_rules
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND rule_key IN ('pipeline-stagnation', 'proposal-stuck');

INSERT INTO alert_rules(org_id, rule_key, severity, threshold, enabled, cooldown_minutes, channel_ids)
VALUES
  ('$ORG_ID_SQL'::uuid, 'pipeline-stagnation', 'high', 12, true, 30, '{}'::uuid[]),
  ('$ORG_ID_SQL'::uuid, 'proposal-stuck', 'critical', 7, true, 15, '{}'::uuid[]);

DELETE FROM report_schedules
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND name = '[DEMO] Weekly Digest';

INSERT INTO report_schedules(
  org_id,
  name,
  frequency,
  day_of_week,
  hour_utc,
  minute_utc,
  timezone,
  recipients,
  format,
  is_active,
  next_run_at,
  updated_at
)
VALUES (
  '$ORG_ID_SQL'::uuid,
  '[DEMO] Weekly Digest',
  'weekly',
  1,
  12,
  0,
  'America/Sao_Paulo',
  'alerts-demo@rfy.local',
  'link',
  true,
  now() + interval '4 days',
  now()
);

DELETE FROM forecast_scenarios
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND name IN ('[DEMO] Base', '[DEMO] Agressivo');

INSERT INTO forecast_scenarios(org_id, name, assumptions_json, is_default, created_by, updated_at)
VALUES
  ('$ORG_ID_SQL'::uuid, '[DEMO] Base', '{"win_rate_delta":0,"cycle_days_delta":0}'::jsonb, true, '$USER_ID_SQL'::uuid, now()),
  ('$ORG_ID_SQL'::uuid, '[DEMO] Agressivo', '{"win_rate_delta":0.08,"cycle_days_delta":-12}'::jsonb, false, '$USER_ID_SQL'::uuid, now());

INSERT INTO quarterly_goals(org_id, year, quarter, target_revenue, target_win_rate, target_cycle_days, notes)
VALUES (
  '$ORG_ID_SQL'::uuid,
  EXTRACT(YEAR FROM now())::int,
  1,
  3200000,
  0.38,
  52,
  'Meta seed demo'
)
ON CONFLICT (org_id, year, quarter) DO UPDATE
SET target_revenue = EXCLUDED.target_revenue,
    target_win_rate = EXCLUDED.target_win_rate,
    target_cycle_days = EXCLUDED.target_cycle_days,
    notes = EXCLUDED.notes;

INSERT INTO retention_cohorts(org_id, cohort_month, segment, customers_start, customers_retained, retention_rate, expansion_mrr, churn_mrr)
VALUES
  ('$ORG_ID_SQL'::uuid, date_trunc('month', now())::date - interval '2 month', 'smb', 120, 104, 0.8667, 14000, 3500),
  ('$ORG_ID_SQL'::uuid, date_trunc('month', now())::date - interval '1 month', 'smb', 128, 114, 0.8906, 16200, 3100),
  ('$ORG_ID_SQL'::uuid, date_trunc('month', now())::date, 'smb', 132, 119, 0.9015, 17100, 2800)
ON CONFLICT (org_id, cohort_month, segment) DO UPDATE
SET customers_start = EXCLUDED.customers_start,
    customers_retained = EXCLUDED.customers_retained,
    retention_rate = EXCLUDED.retention_rate,
    expansion_mrr = EXCLUDED.expansion_mrr,
    churn_mrr = EXCLUDED.churn_mrr;

INSERT INTO data_quality_runs(org_id, source_kind, score, issues_json)
VALUES (
  '$ORG_ID_SQL'::uuid,
  'full',
  92.4,
  '[{"type":"missing_owner","count":2},{"type":"invalid_stage","count":1}]'::jsonb
);

DELETE FROM usage_events
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND metadata_json->>'seed' = 'demo_v1';

INSERT INTO usage_events(org_id, metric, quantity, event_at, metadata_json)
VALUES
  ('$ORG_ID_SQL'::uuid, 'uploads_30d', 2, now() - interval '1 day', '{"seed":"demo_v1"}'::jsonb),
  ('$ORG_ID_SQL'::uuid, 'active_deals', 6, now() - interval '2 hours', '{"seed":"demo_v1"}'::jsonb),
  ('$ORG_ID_SQL'::uuid, 'api_calls', 14, now() - interval '3 hours', '{"seed":"demo_v1"}'::jsonb);

DELETE FROM reports
WHERE org_id = '$ORG_ID_SQL'::uuid
  AND impact_json->>'seed_tag' = 'demo_v1';

INSERT INTO reports(org_id, upload_id, generated_at, snapshot_json, frictions_json, pillar_scores_json, impact_json)
VALUES (
  '$ORG_ID_SQL'::uuid,
  'a7f6c321-6f8b-43ba-9519-111111111111'::uuid,
  now(),
  jsonb_build_object(
    'total_open', 5,
    'pipeline_value_open', 1430000,
    'open_by_stage', jsonb_build_object('Proposta', 2, 'Negociacao', 2, 'Qualificacao', 1),
    'topDealsPropostaRisco', jsonb_build_array(
      jsonb_build_object('crm_hash','demo-opp-001','company_name','Atlas Energia','title','Expansao Nacional','owner_name','Ana Clara','owner_email','ana@rfy.local','days_without_activity',19,'age_days',47,'value',420000,'stage_name','Proposta','created_date',(current_date - 60)::text),
      jsonb_build_object('crm_hash','demo-opp-002','company_name','Norte Pharma','title','Plataforma Comercial','owner_name','Ana Clara','owner_email','ana@rfy.local','days_without_activity',16,'age_days',40,'value',280000,'stage_name','Proposta','created_date',(current_date - 45)::text)
    ),
    'topDealsAbandoned', jsonb_build_array(
      jsonb_build_object('crm_hash','demo-opp-003','company_name','Sigma Log','title','Rollout Filiais','owner_name','Bruno Lima','owner_email','bruno@rfy.local','days_without_activity',14,'age_days',34,'value',360000,'stage_name','Negociacao','created_date',(current_date - 34)::text),
      jsonb_build_object('crm_hash','demo-opp-004','company_name','Delta Foods','title','Otimizacao RevenueOps','owner_name','Carla Souza','owner_email','carla@rfy.local','days_without_activity',12,'age_days',29,'value',240000,'stage_name','Negociacao','created_date',(current_date - 29)::text)
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'id','proposta-alto-risco',
      'name','Propostas em risco',
      'description','Deals em proposta sem atividade recente.',
      'count',2,
      'evidence',jsonb_build_array(
        jsonb_build_object('crm_hash','demo-opp-001','company_name','Atlas Energia','value',420000),
        jsonb_build_object('crm_hash','demo-opp-002','company_name','Norte Pharma','value',280000)
      )
    ),
    jsonb_build_object(
      'id','pipeline-abandonado',
      'name','Pipeline abandonado',
      'description','Oportunidades sem follow-up ativo.',
      'count',2,
      'evidence',jsonb_build_array(
        jsonb_build_object('crm_hash','demo-opp-003','company_name','Sigma Log','value',360000),
        jsonb_build_object('crm_hash','demo-opp-004','company_name','Delta Foods','value',240000)
      )
    )
  ),
  jsonb_build_object(
    'pipeline_hygiene', jsonb_build_object('score', 74.3),
    'post_proposal_stagnation', jsonb_build_object('score', 67.8)
  ),
  jsonb_build_object(
    'revenue_annual', 7280000,
    'cycle_reduction_pct', 11.4,
    'revenue_anticipated', 614000,
    'seed_tag', 'demo_v1'
  )
);

INSERT INTO org_audit_logs(org_id, actor_user_id, action, entity_type, metadata_json)
VALUES (
  '$ORG_ID_SQL'::uuid,
  '$USER_ID_SQL'::uuid,
  'seed.demo.applied',
  'seed',
  '{"seed":"demo_v1"}'::jsonb
);

-- SUPHO: campanha e resultado de diagnóstico demo (requer migração 007)
INSERT INTO supho_diagnostic_campaigns(id, org_id, name, started_at, closed_at, status, created_at, updated_at)
VALUES (
  'b7f6c321-6f8b-43ba-9519-000000000001'::uuid,
  '$ORG_ID_SQL'::uuid,
  '[DEMO] Diagnóstico SUPHO',
  now() - interval '7 days',
  now() - interval '1 day',
  'closed',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, status = EXCLUDED.status, closed_at = EXCLUDED.closed_at, updated_at = now();

DELETE FROM supho_diagnostic_results
WHERE org_id = '$ORG_ID_SQL'::uuid AND campaign_id = 'b7f6c321-6f8b-43ba-9519-000000000001'::uuid;

INSERT INTO supho_diagnostic_results(org_id, campaign_id, computed_at, ic, ih, ip, itsmo, nivel, gap_c_h, gap_c_p, ise, ipt, icl, sample_size, result_json)
VALUES (
  '$ORG_ID_SQL'::uuid,
  'b7f6c321-6f8b-43ba-9519-000000000001'::uuid,
  now(),
  72.5,
  68.0,
  65.0,
  68.8,
  3,
  4.5,
  7.5,
  3.8,
  3.6,
  3.5,
  24,
  '{"seed":"demo_v1"}'::jsonb
);

COMMIT;
SQL

opps_count="$(query_value "SELECT COUNT(*) FROM opportunities WHERE org_id = '$ORG_ID_SQL'::uuid;")"
acts_count="$(query_value "SELECT COUNT(*) FROM activities WHERE org_id = '$ORG_ID_SQL'::uuid;")"
reports_count="$(query_value "SELECT COUNT(*) FROM reports WHERE org_id = '$ORG_ID_SQL'::uuid;")"

cat <<MSG
✓ Seed aplicado com sucesso.
  Organização: $DEMO_ORG_NAME ($DEMO_ORG_ID)
  Usuário owner: $DEMO_USER_ID
  Oportunidades: $opps_count
  Atividades: $acts_count
  Reports: $reports_count
MSG
