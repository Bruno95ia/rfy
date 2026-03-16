-- Integridade referencial: FKs de org_members e org_invites para app_users.
-- UNIQUE em supho_certification_evidences(run_id, criterion_id) com tratamento de duplicados.

-- 1) org_members.user_id -> app_users(id)
ALTER TABLE org_members
  DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;
ALTER TABLE org_members
  ADD CONSTRAINT org_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- 2) org_members.invited_by -> app_users(id) (nullable, SET NULL se user for removido)
ALTER TABLE org_members
  DROP CONSTRAINT IF EXISTS org_members_invited_by_fkey;
ALTER TABLE org_members
  ADD CONSTRAINT org_members_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES app_users(id) ON DELETE SET NULL;

-- 3) org_invites.invited_by_user_id -> app_users(id)
ALTER TABLE org_invites
  DROP CONSTRAINT IF EXISTS org_invites_invited_by_user_id_fkey;
ALTER TABLE org_invites
  ADD CONSTRAINT org_invites_invited_by_user_id_fkey
  FOREIGN KEY (invited_by_user_id) REFERENCES app_users(id) ON DELETE RESTRICT;

-- 4) supho_certification_evidences: remover duplicados (run_id, criterion_id) mantendo um por par (menor id)
DELETE FROM supho_certification_evidences e
USING supho_certification_evidences e2
WHERE e.run_id = e2.run_id
  AND e.criterion_id = e2.criterion_id
  AND e.id > e2.id;

-- 5) UNIQUE em (run_id, criterion_id)
ALTER TABLE supho_certification_evidences
  DROP CONSTRAINT IF EXISTS supho_certification_evidences_run_criterion_key;
ALTER TABLE supho_certification_evidences
  ADD CONSTRAINT supho_certification_evidences_run_criterion_key UNIQUE (run_id, criterion_id);
