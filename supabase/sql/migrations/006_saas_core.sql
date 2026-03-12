-- SaaS core: billing, RBAC, auditoria, alertas, API keys, webhooks, relatórios,
-- qualidade de dados, cenários e retenção.

-- RBAC em org_members
ALTER TABLE org_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS invited_by uuid;

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON org_members(org_id, role);

-- Funções utilitárias para RLS
CREATE OR REPLACE FUNCTION org_user_is_member(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_members om
    WHERE om.org_id = target_org_id
      AND om.user_id = current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION org_user_can_manage(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_members om
    WHERE om.org_id = target_org_id
      AND om.user_id = current_user_id()
      AND om.role IN ('owner', 'admin')
  );
$$;

-- Billing
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  seats_limit int NOT NULL DEFAULT 1,
  uploads_limit_30d int NOT NULL DEFAULT 50,
  active_deals_limit int NOT NULL DEFAULT 500,
  features_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO plans(id, name, price_monthly, seats_limit, uploads_limit_30d, active_deals_limit, features_json)
VALUES
  ('starter', 'Starter', 0, 8, 120, 500, '{"alerts":["email"],"reports":["weekly"],"integrations":["webhook"],"api_keys":2}'::jsonb),
  ('pro', 'Pro', 299, 25, 800, 5000, '{"alerts":["email","slack","webhook"],"reports":["daily","weekly"],"integrations":["crm","webhook"],"api_keys":10}'::jsonb),
  ('business', 'Business', 899, 100, 5000, 50000, '{"alerts":["email","slack","whatsapp","webhook"],"reports":["daily","weekly","monthly"],"integrations":["crm","webhook"],"api_keys":100}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  seats_limit = EXCLUDED.seats_limit,
  uploads_limit_30d = EXCLUDED.uploads_limit_30d,
  active_deals_limit = EXCLUDED.active_deals_limit,
  features_json = EXCLUDED.features_json,
  is_active = true;

CREATE TABLE IF NOT EXISTS org_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES orgs(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES plans(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_plan ON org_subscriptions(plan_id);

CREATE TABLE IF NOT EXISTS usage_limits (
  org_id uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  seats_limit int,
  uploads_limit_30d int,
  active_deals_limit int,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric IN ('uploads_30d', 'seats', 'active_deals', 'api_calls')),
  quantity int NOT NULL DEFAULT 1,
  event_at timestamptz NOT NULL DEFAULT now(),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_metric_time
  ON usage_events(org_id, metric, event_at DESC);

-- Auditoria
CREATE TABLE IF NOT EXISTS org_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_created ON org_audit_logs(org_id, created_at DESC);

-- Alertas
CREATE TABLE IF NOT EXISTS alert_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('email', 'slack', 'webhook', 'whatsapp')),
  target text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_channels_org ON alert_channels(org_id, is_active);

CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  threshold numeric,
  enabled boolean NOT NULL DEFAULT true,
  cooldown_minutes int NOT NULL DEFAULT 30,
  channel_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_org ON alert_rules(org_id, enabled);

CREATE TABLE IF NOT EXISTS alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES alert_rules(id) ON DELETE SET NULL,
  severity text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'sent', 'failed', 'ack')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_events_org_created ON alert_events(org_id, created_at DESC);

-- Onboarding
CREATE TABLE IF NOT EXISTS org_onboarding_steps (
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  completed_at timestamptz,
  completed_by uuid,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (org_id, step_key)
);

-- API Keys
CREATE TABLE IF NOT EXISTS org_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  created_by uuid,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_api_keys_org ON org_api_keys(org_id, revoked_at);

-- Webhooks outbound
CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_url text NOT NULL,
  secret_encrypted text,
  events text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  last_status text,
  last_error text,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_org ON outbound_webhooks(org_id, is_active);

-- Relatórios agendados
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_week int,
  day_of_month int,
  hour_utc int NOT NULL DEFAULT 12,
  minute_utc int NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  recipients text NOT NULL,
  format text NOT NULL DEFAULT 'link' CHECK (format IN ('pdf', 'csv', 'link')),
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_org ON report_schedules(org_id, is_active);

-- Qualidade de dados
CREATE TABLE IF NOT EXISTS data_quality_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_kind text NOT NULL CHECK (source_kind IN ('opportunities', 'activities', 'full')),
  score numeric NOT NULL DEFAULT 0,
  issues_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_quality_runs_org_created ON data_quality_runs(org_id, created_at DESC);

-- Cenários e metas
CREATE TABLE IF NOT EXISTS forecast_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  assumptions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecast_scenarios_org ON forecast_scenarios(org_id);

CREATE TABLE IF NOT EXISTS quarterly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  year int NOT NULL,
  quarter int NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  target_revenue numeric,
  target_win_rate numeric,
  target_cycle_days numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, year, quarter)
);

CREATE INDEX IF NOT EXISTS idx_quarterly_goals_org ON quarterly_goals(org_id, year DESC, quarter DESC);

-- Retenção / expansão
CREATE TABLE IF NOT EXISTS retention_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  cohort_month date NOT NULL,
  segment text NOT NULL DEFAULT '',
  customers_start int NOT NULL DEFAULT 0,
  customers_retained int NOT NULL DEFAULT 0,
  retention_rate numeric,
  expansion_mrr numeric,
  churn_mrr numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, cohort_month, segment)
);

CREATE INDEX IF NOT EXISTS idx_retention_cohorts_org ON retention_cohorts(org_id, cohort_month DESC);

-- Default subscription por org nova
CREATE OR REPLACE FUNCTION ensure_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO org_subscriptions(org_id, plan_id, status)
  VALUES (NEW.id, 'starter', 'active')
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_default_subscription ON orgs;
CREATE TRIGGER trg_org_default_subscription
AFTER INSERT ON orgs
FOR EACH ROW
EXECUTE FUNCTION ensure_default_subscription();

-- Cobrir orgs já existentes
INSERT INTO org_subscriptions(org_id, plan_id, status)
SELECT id, 'starter', 'active'
FROM orgs
ON CONFLICT (org_id) DO NOTHING;

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_cohorts ENABLE ROW LEVEL SECURITY;

-- plans: leitura para autenticados
DROP POLICY IF EXISTS plans_select_all ON plans;
CREATE POLICY plans_select_all
  ON plans FOR SELECT
  USING (true);

-- member select policies
CREATE POLICY org_subscriptions_select_member ON org_subscriptions
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY usage_limits_select_member ON usage_limits
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY usage_events_select_member ON usage_events
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY org_audit_logs_select_member ON org_audit_logs
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY alert_channels_select_member ON alert_channels
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY alert_rules_select_member ON alert_rules
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY alert_events_select_member ON alert_events
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY org_onboarding_steps_select_member ON org_onboarding_steps
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY org_api_keys_select_member ON org_api_keys
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY outbound_webhooks_select_member ON outbound_webhooks
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY report_schedules_select_member ON report_schedules
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY data_quality_runs_select_member ON data_quality_runs
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY forecast_scenarios_select_member ON forecast_scenarios
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY quarterly_goals_select_member ON quarterly_goals
  FOR SELECT USING (org_user_is_member(org_id));
CREATE POLICY retention_cohorts_select_member ON retention_cohorts
  FOR SELECT USING (org_user_is_member(org_id));

-- manage policies (owner/admin)
CREATE POLICY org_subscriptions_manage_admin ON org_subscriptions
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY usage_limits_manage_admin ON usage_limits
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY usage_events_manage_admin ON usage_events
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY org_audit_logs_manage_admin ON org_audit_logs
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY alert_channels_manage_admin ON alert_channels
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY alert_rules_manage_admin ON alert_rules
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY alert_events_manage_admin ON alert_events
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY org_onboarding_steps_manage_admin ON org_onboarding_steps
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY org_api_keys_manage_admin ON org_api_keys
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY outbound_webhooks_manage_admin ON outbound_webhooks
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY report_schedules_manage_admin ON report_schedules
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY data_quality_runs_manage_admin ON data_quality_runs
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY forecast_scenarios_manage_admin ON forecast_scenarios
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY quarterly_goals_manage_admin ON quarterly_goals
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
CREATE POLICY retention_cohorts_manage_admin ON retention_cohorts
  FOR ALL USING (org_user_can_manage(org_id)) WITH CHECK (org_user_can_manage(org_id));
