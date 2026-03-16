-- Pessoas e demais envolvidos da empresa (por organização)
-- Cada registro representa uma pessoa ligada à org (contato interno, decisor, usuário, influenciador, etc.)

CREATE TABLE IF NOT EXISTS org_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  -- Identificação básica
  full_name text NOT NULL,
  email text,
  phone text,
  -- Organização / empresa à qual esta pessoa está vinculada (nome livre; pode ser igual à org ou cliente específico)
  company_name text,
  -- Dimensões de relacionamento
  person_type text NOT NULL DEFAULT 'stakeholder'
    CHECK (person_type IN ('decision_maker', 'economic_buyer', 'champion', 'user', 'influencer', 'stakeholder', 'finance', 'procurement', 'other')),
  department text,
  seniority text
    CHECK (seniority IN ('c_level', 'vp', 'director', 'manager', 'analyst', 'other')) DEFAULT 'other',
  role_title text,
  persona_tag text,
  is_key_contact boolean NOT NULL DEFAULT false,
  -- Contexto comercial (opcional, para futuras correlações com oportunidades)
  owner_email text,
  notes text,
  -- Metadados
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_people_org ON org_people(org_id);
CREATE INDEX IF NOT EXISTS idx_org_people_org_key_contact ON org_people(org_id, is_key_contact);

-- RLS
ALTER TABLE org_people ENABLE ROW LEVEL SECURITY;

-- Qualquer membro da organização pode ler as pessoas ligadas à org
CREATE POLICY org_people_select_member
  ON org_people FOR SELECT
  USING (org_user_is_member(org_id));

-- Apenas quem pode gerenciar a org (owner/admin) pode criar/editar/deletar pessoas
CREATE POLICY org_people_manage_admin
  ON org_people FOR ALL
  USING (org_user_can_manage(org_id))
  WITH CHECK (org_user_can_manage(org_id));

