-- Curto prazo RFY: status de métricas em quase tempo real + alertas abertos no painel.

CREATE TABLE IF NOT EXISTS metrics_status (
  org_id uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 1,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_status_updated
  ON metrics_status(last_updated_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES alert_rules(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  severidade text NOT NULL DEFAULT 'medium' CHECK (severidade IN ('low', 'medium', 'high', 'critical')),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  valor_atual numeric,
  limiar numeric,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Idempotência: no máximo 1 alerta aberto por tipo/organização.
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_open_unique
  ON alerts(org_id, tipo)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_org_open
  ON alerts(org_id, created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE metrics_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- metrics_status
DROP POLICY IF EXISTS metrics_status_select_member ON metrics_status;
DROP POLICY IF EXISTS metrics_status_manage_admin ON metrics_status;

CREATE POLICY metrics_status_select_member ON metrics_status
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = current_user_id()
    )
  );

CREATE POLICY metrics_status_manage_admin ON metrics_status
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = current_user_id()
        AND COALESCE(role, 'owner') IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = current_user_id()
        AND COALESCE(role, 'owner') IN ('owner', 'admin')
    )
  );

-- alerts
DROP POLICY IF EXISTS alerts_select_member ON alerts;
DROP POLICY IF EXISTS alerts_manage_admin ON alerts;

CREATE POLICY alerts_select_member ON alerts
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = current_user_id()
    )
  );

CREATE POLICY alerts_manage_admin ON alerts
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = current_user_id()
        AND COALESCE(role, 'owner') IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = current_user_id()
        AND COALESCE(role, 'owner') IN ('owner', 'admin')
    )
  );

-- Canal padrão da regra para fase atual (somente painel).
ALTER TABLE alert_rules
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'painel';
