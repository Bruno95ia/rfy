-- Unit Economics e ICP (Ideal Customer Profile)
-- CAC, LTV, Churn + estudo ICP por empresa com IA

-- Métricas de unit economics por organização (calculadas ou manuais)
CREATE TABLE IF NOT EXISTS org_unit_economics (
  org_id uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  -- Computados do CRM
  ltv_computed numeric,
  churn_rate numeric,
  win_rate numeric,
  avg_deal_value numeric,
  deals_won_count int,
  deals_lost_count int,
  deals_open_count int,
  -- Manual: CAC e custo de aquisição (usuário informa em Settings)
  cac_manual numeric,
  marketing_spend_monthly numeric,
  -- Ratio LTV/CAC (quando ambos disponíveis)
  ltv_cac_ratio numeric,
  computed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_org_unit_economics_computed ON org_unit_economics(computed_at);

-- Estudo ICP por empresa (cache da análise gerada por IA)
CREATE TABLE IF NOT EXISTS org_icp_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- Resumo: qual ICP a empresa está atingindo
  icp_summary text,
  -- Estudo detalhado por empresa/segmento (JSON: empresas analisadas)
  icp_study_json jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now(),
  model_used text
);

CREATE INDEX idx_org_icp_studies_org ON org_icp_studies(org_id);
CREATE INDEX idx_org_icp_studies_generated ON org_icp_studies(org_id, generated_at DESC);

-- Adicionar CAC em org_config para usuário configurar
ALTER TABLE org_config
  ADD COLUMN IF NOT EXISTS cac_manual numeric,
  ADD COLUMN IF NOT EXISTS marketing_spend_monthly numeric;

-- RLS
ALTER TABLE org_unit_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_icp_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_unit_economics_select_member"
  ON org_unit_economics FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "org_unit_economics_insert_service"
  ON org_unit_economics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "org_unit_economics_update_service"
  ON org_unit_economics FOR UPDATE
  USING (true);

CREATE POLICY "org_icp_studies_select_member"
  ON org_icp_studies FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "org_icp_studies_insert_member"
  ON org_icp_studies FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
