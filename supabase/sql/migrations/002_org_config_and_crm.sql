-- Unique para upsert de opportunities via API
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_org_crm_hash_unique
  ON opportunities(org_id, crm_hash);

-- Configurações por organização
CREATE TABLE IF NOT EXISTS org_config (
  org_id uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  -- Organização
  org_display_name text,
  -- Limiares de fricção (dias)
  dias_proposta_risco int DEFAULT 7,
  dias_pipeline_abandonado int DEFAULT 14,
  dias_aging_inflado int DEFAULT 60,
  dias_aprovacao_travada int DEFAULT 5,
  -- Notificações
  notificar_email boolean DEFAULT true,
  email_notificacoes text, -- lista separada por vírgula
  incluir_convite_calendario boolean DEFAULT true,
  -- Relatório
  top_deals_por_friccao int DEFAULT 20,
  top_evidencias_por_friccao int DEFAULT 10,
  -- Timezone para agendamentos
  timezone text DEFAULT 'America/Sao_Paulo',
  updated_at timestamptz DEFAULT now()
);

-- Integrações CRM por organização
CREATE TABLE IF NOT EXISTS crm_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('piperun', 'pipedrive', 'hubspot', 'generic', 'n8n_webhook')),
  -- Para APIs: API key ou token
  api_key_encrypted text,
  api_url text, -- base URL da API se necessário
  -- Para webhook (receber dados de n8n, etc)
  webhook_secret text, -- para validar assinatura
  webhook_enabled boolean DEFAULT false,
  -- Config mapeamento (JSON para colunas custom)
  field_mapping_json jsonb DEFAULT '{}'::jsonb,
  -- Status
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, provider)
);

CREATE INDEX idx_crm_integrations_org ON crm_integrations(org_id);

-- RLS
ALTER TABLE org_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_config_select_member"
  ON org_config FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "org_config_update_member"
  ON org_config FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "crm_integrations_select_member"
  ON crm_integrations FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "crm_integrations_insert_member"
  ON crm_integrations FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "crm_integrations_update_member"
  ON crm_integrations FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "crm_integrations_delete_member"
  ON crm_integrations FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
