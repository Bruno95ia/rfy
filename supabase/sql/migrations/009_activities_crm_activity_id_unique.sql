-- Deduplicação de activities por (org_id, crm_activity_id) para sync de CRMs.
-- Permite upsert quando crm_activity_id está preenchido.
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_org_crm_activity_id
  ON activities(org_id, crm_activity_id)
  WHERE crm_activity_id IS NOT NULL AND crm_activity_id != '';
