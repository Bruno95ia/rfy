-- Revenue Friction Engine - Schema DDL
-- Execute no Supabase SQL Editor após criar o projeto

-- Compatibilidade local (Postgres puro, sem Supabase gerenciado)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth'
      AND p.proname = 'uid'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid()
      RETURNS uuid
      LANGUAGE sql
      STABLE
      AS $body$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $body$;
    $fn$;
  END IF;
END
$do$;

-- Helper para RLS: retorna auth.uid()
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- 1. orgs
CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. org_members
CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (org_id, user_id)
);

-- 3. uploads
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('opportunities', 'activities')),
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'done', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_uploads_org_id ON uploads(org_id);
CREATE INDEX idx_uploads_status ON uploads(org_id, status);

-- 4. opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL,
  crm_source text NOT NULL DEFAULT 'piperun',
  crm_hash text NOT NULL,
  pipeline_name text,
  stage_name text,
  stage_timing_days numeric,
  owner_email text,
  owner_name text,
  company_name text,
  title text,
  value numeric,
  created_date date,
  closed_date date,
  status text CHECK (status IN ('open', 'won', 'lost')),
  tags text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_opportunities_org_id ON opportunities(org_id);
CREATE INDEX idx_opportunities_org_stage ON opportunities(org_id, stage_name);
CREATE INDEX idx_opportunities_org_hash ON opportunities(org_id, crm_hash);

-- 5. activities
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES uploads(id) ON DELETE SET NULL,
  crm_activity_id text,
  type text,
  title text,
  owner text,
  start_at timestamptz,
  due_at timestamptz,
  done_at timestamptz,
  created_at_crm timestamptz,
  status text,
  opportunity_id_crm text,
  pipeline_name text,
  stage_name text,
  company_name text,
  opportunity_title text,
  opportunity_owner_name text,
  linked_opportunity_hash text,
  link_confidence text CHECK (link_confidence IN ('high', 'medium', 'low', 'none')) DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_org_id ON activities(org_id);
CREATE INDEX idx_activities_org_linked ON activities(org_id, linked_opportunity_hash);

-- 6. reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES uploads(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  frictions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pillar_scores_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  impact_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_reports_org_generated ON reports(org_id, generated_at DESC);

-- RLS mínimo viável

ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- org_members: user pode select onde user_id = auth.uid()
CREATE POLICY "org_members_select_own"
  ON org_members FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "org_members_insert_own"
  ON org_members FOR INSERT
  WITH CHECK (user_id = current_user_id());

-- orgs: user pode ver orgs onde está em org_members
CREATE POLICY "orgs_select_member"
  ON orgs FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "orgs_insert"
  ON orgs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "orgs_update_member"
  ON orgs FOR UPDATE
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

-- uploads: select/insert/update/delete quando org_id pertence às orgs do usuário
CREATE POLICY "uploads_select_org"
  ON uploads FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "uploads_insert_org"
  ON uploads FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "uploads_update_org"
  ON uploads FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "uploads_delete_org"
  ON uploads FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

-- opportunities
CREATE POLICY "opportunities_select_org"
  ON opportunities FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "opportunities_insert_org"
  ON opportunities FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "opportunities_update_org"
  ON opportunities FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "opportunities_delete_org"
  ON opportunities FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

-- activities
CREATE POLICY "activities_select_org"
  ON activities FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "activities_insert_org"
  ON activities FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "activities_update_org"
  ON activities FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "activities_delete_org"
  ON activities FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

-- reports
CREATE POLICY "reports_select_org"
  ON reports FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "reports_insert_org"
  ON reports FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "reports_update_org"
  ON reports FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

CREATE POLICY "reports_delete_org"
  ON reports FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
  );

-- Storage: bucket 'uploads' (criar pelo Dashboard ou via API)
-- Se preferir SQL, descomente e execute (requer permissões):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false)
-- ON CONFLICT (id) DO NOTHING;
--
-- Políticas para o bucket uploads:
-- CREATE POLICY "Authenticated upload"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'uploads');
--
-- CREATE POLICY "Service role full"
--   ON storage.objects FOR ALL TO service_role
--   USING (bucket_id = 'uploads');
