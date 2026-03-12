-- Convites por e-mail para organizações.
-- Permite owner/admin convidar por e-mail com role; convidado aceita via link com token.

CREATE TABLE IF NOT EXISTS org_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  invited_by_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_org_invites_email_org ON org_invites(org_id, email) WHERE status = 'pending';

COMMENT ON TABLE org_invites IS 'Convites pendentes e histórico; token usado na URL de aceite.';

-- RLS: membros da org com role owner/admin podem ver e gerenciar convites da org.
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_invites_select_manage"
  ON org_invites FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = current_user_id()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_invites_insert_manage"
  ON org_invites FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = current_user_id()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_invites_update_manage"
  ON org_invites FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = current_user_id()
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (true);

-- Aceite de convite: qualquer usuário autenticado pode atualizar um invite com token válido para accepted (via API que valida token).
-- Para não expor atualização genérica, a API usa service role para aceitar. Não criamos policy de UPDATE para "qualquer um".
-- Leitura por token: a API de accept usa admin client para buscar por token; não precisa de policy SELECT para anônimo.
