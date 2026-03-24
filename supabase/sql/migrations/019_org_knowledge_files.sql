-- Repositório Conhecimento: arquivos por organização (e opcionalmente por campanha SUPHO)

CREATE TABLE IF NOT EXISTS org_knowledge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES supho_diagnostic_campaigns(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  UNIQUE (org_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_org_knowledge_org ON org_knowledge_files(org_id);
CREATE INDEX IF NOT EXISTS idx_org_knowledge_campaign ON org_knowledge_files(org_id, campaign_id);

COMMENT ON TABLE org_knowledge_files IS 'Arquivos de contexto (qualquer tipo); campaign_id NULL = válido para todas as campanhas da org.';
COMMENT ON COLUMN org_knowledge_files.campaign_id IS 'Se preenchido, o arquivo restringe-se a esta campanha; NULL = conhecimento global da org.';

ALTER TABLE org_knowledge_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_knowledge_select_member" ON org_knowledge_files;
CREATE POLICY "org_knowledge_select_member"
  ON org_knowledge_files FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

DROP POLICY IF EXISTS "org_knowledge_insert_member" ON org_knowledge_files;
CREATE POLICY "org_knowledge_insert_member"
  ON org_knowledge_files FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

DROP POLICY IF EXISTS "org_knowledge_update_member" ON org_knowledge_files;
CREATE POLICY "org_knowledge_update_member"
  ON org_knowledge_files FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

DROP POLICY IF EXISTS "org_knowledge_delete_member" ON org_knowledge_files;
CREATE POLICY "org_knowledge_delete_member"
  ON org_knowledge_files FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
