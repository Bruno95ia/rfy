-- Convites para responder formulário identificado.
-- Cada registro representa um envio de link único para um respondente.

CREATE TABLE IF NOT EXISTS form_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  token text NOT NULL UNIQUE,
  form_slug text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | answered | bounced | cancelled
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_invites_email ON form_invites(email);
CREATE INDEX IF NOT EXISTS idx_form_invites_form_slug ON form_invites(form_slug);
CREATE INDEX IF NOT EXISTS idx_form_invites_token ON form_invites(token);

COMMENT ON TABLE form_invites IS 'Convites de formulário com link identificado por token.';

