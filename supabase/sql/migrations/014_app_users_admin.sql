-- Admin de plataforma e status de usuários (app_users)

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(is_active);
CREATE INDEX IF NOT EXISTS idx_app_users_admin ON app_users(is_platform_admin);

