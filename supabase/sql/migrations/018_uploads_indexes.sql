-- Listagem de uploads por org + status (idempotente em bases já provisionadas)
CREATE INDEX IF NOT EXISTS idx_uploads_org_id ON uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(org_id, status);
