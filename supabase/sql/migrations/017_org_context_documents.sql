-- Documentos de contexto por organização + status ERP para o diagnóstico SUPHO

ALTER TABLE org_config
  ADD COLUMN IF NOT EXISTS erp_integration_status text NOT NULL DEFAULT 'unknown';

ALTER TABLE org_config
  DROP CONSTRAINT IF EXISTS org_config_erp_integration_status_check;

ALTER TABLE org_config
  ADD CONSTRAINT org_config_erp_integration_status_check
  CHECK (erp_integration_status IN ('unknown', 'integrated', 'not_integrated'));

UPDATE org_config SET erp_integration_status = 'unknown' WHERE erp_integration_status IS NULL;

CREATE TABLE IF NOT EXISTS org_context_documents (
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  doc_key text NOT NULL,
  title text,
  body_markdown text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, doc_key)
);

CREATE INDEX IF NOT EXISTS idx_org_context_documents_org ON org_context_documents(org_id);

ALTER TABLE org_context_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_context_documents_select_member" ON org_context_documents;
CREATE POLICY "org_context_documents_select_member"
  ON org_context_documents FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

DROP POLICY IF EXISTS "org_context_documents_insert_member" ON org_context_documents;
CREATE POLICY "org_context_documents_insert_member"
  ON org_context_documents FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

DROP POLICY IF EXISTS "org_context_documents_update_member" ON org_context_documents;
CREATE POLICY "org_context_documents_update_member"
  ON org_context_documents FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

DROP POLICY IF EXISTS "org_context_documents_delete_member" ON org_context_documents;
CREATE POLICY "org_context_documents_delete_member"
  ON org_context_documents FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
