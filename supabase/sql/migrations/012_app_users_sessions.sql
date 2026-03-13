-- Autenticação própria: usuários e sessões (substitui dependência de Supabase Auth).
-- Compatível com org_members.user_id (uuid); app_users.id é o user_id usado em org_members.

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

CREATE TABLE IF NOT EXISTS app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at ON app_sessions(expires_at);

COMMENT ON TABLE app_users IS 'Usuários da aplicação (auth própria, sem Supabase).';
COMMENT ON TABLE app_sessions IS 'Sessões ativas; cookie guarda session id.';
