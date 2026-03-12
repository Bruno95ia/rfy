-- SUPHO: Diagnóstico, PAIP, Rituais, Certificação
-- Integração ao Revenue Engine (Módulo 5 = dados CRM existentes)

-- 1) Diagnóstico: campanhas e respondentes
CREATE TABLE IF NOT EXISTS supho_diagnostic_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  started_at timestamptz,
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_campaigns_org ON supho_diagnostic_campaigns(org_id);
CREATE INDEX idx_supho_campaigns_status ON supho_diagnostic_campaigns(org_id, status);

-- Perguntas (template por org ou global; bloco A/B/C, peso 1/2/3)
CREATE TABLE IF NOT EXISTS supho_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES orgs(id) ON DELETE CASCADE,
  block text NOT NULL CHECK (block IN ('A', 'B', 'C')),
  internal_weight int NOT NULL DEFAULT 1 CHECK (internal_weight IN (1, 2, 3)),
  question_text text,
  item_code text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_questions_org ON supho_questions(org_id);

-- Respondentes (por campanha)
CREATE TABLE IF NOT EXISTS supho_respondents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES supho_diagnostic_campaigns(id) ON DELETE CASCADE,
  time_area text,
  unit text,
  role text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_respondents_campaign ON supho_respondents(campaign_id);

-- Respostas (respondente + pergunta → valor 1-5)
CREATE TABLE IF NOT EXISTS supho_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  respondent_id uuid NOT NULL REFERENCES supho_respondents(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES supho_questions(id) ON DELETE CASCADE,
  value int NOT NULL CHECK (value >= 1 AND value <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(respondent_id, question_id)
);

CREATE INDEX idx_supho_answers_respondent ON supho_answers(respondent_id);
CREATE INDEX idx_supho_answers_question ON supho_answers(question_id);

-- Resultado do diagnóstico (índices calculados por campanha)
CREATE TABLE IF NOT EXISTS supho_diagnostic_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES supho_diagnostic_campaigns(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  ic numeric NOT NULL,
  ih numeric NOT NULL,
  ip numeric NOT NULL,
  itsmo numeric NOT NULL,
  nivel int NOT NULL CHECK (nivel >= 1 AND nivel <= 5),
  gap_c_h numeric NOT NULL,
  gap_c_p numeric NOT NULL,
  ise numeric,
  ipt numeric,
  icl numeric,
  sample_size int NOT NULL DEFAULT 0,
  result_json jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_supho_results_org ON supho_diagnostic_results(org_id);
CREATE INDEX idx_supho_results_campaign ON supho_diagnostic_results(campaign_id);
CREATE INDEX idx_supho_results_computed ON supho_diagnostic_results(org_id, computed_at DESC);

-- 2) PAIP (plano 90-180 dias)
CREATE TABLE IF NOT EXISTS supho_paip_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  diagnostic_result_id uuid REFERENCES supho_diagnostic_results(id) ON DELETE SET NULL,
  name text NOT NULL,
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_paip_org ON supho_paip_plans(org_id);

CREATE TABLE IF NOT EXISTS supho_paip_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES supho_paip_plans(id) ON DELETE CASCADE,
  gap_type text,
  description text,
  priority_score numeric,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_paip_gaps_plan ON supho_paip_gaps(plan_id);

CREATE TABLE IF NOT EXISTS supho_paip_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id uuid NOT NULL REFERENCES supho_paip_gaps(id) ON DELETE CASCADE,
  objective_text text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_paip_objectives_gap ON supho_paip_objectives(gap_id);

CREATE TABLE IF NOT EXISTS supho_paip_krs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES supho_paip_objectives(id) ON DELETE CASCADE,
  kr_text text NOT NULL,
  source text CHECK (source IN ('crm', 'forms', 'rh')),
  metric_id text,
  target_value text,
  owner_id text,
  due_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_paip_krs_objective ON supho_paip_krs(objective_id);

CREATE TABLE IF NOT EXISTS supho_paip_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id uuid NOT NULL REFERENCES supho_paip_krs(id) ON DELETE CASCADE,
  action_5w2h text,
  owner_id text,
  due_at timestamptz,
  evidence_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_paip_actions_kr ON supho_paip_actions(kr_id);

-- 3) Rituais (execução)
CREATE TABLE IF NOT EXISTS supho_ritual_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('checkin_weekly', 'performance_biweekly', 'feedback_monthly', 'governance_quarterly')),
  cadence text,
  default_agenda text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_ritual_templates_org ON supho_ritual_templates(org_id);

CREATE TABLE IF NOT EXISTS supho_rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES supho_ritual_templates(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  conducted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_rituals_template ON supho_rituals(template_id);

CREATE TABLE IF NOT EXISTS supho_ritual_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id uuid NOT NULL REFERENCES supho_rituals(id) ON DELETE CASCADE,
  decision_text text,
  action_text text,
  owner_id text,
  due_at timestamptz,
  status text DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_ritual_decisions_ritual ON supho_ritual_decisions(ritual_id);

-- 4) Certificação
CREATE TABLE IF NOT EXISTS supho_certification_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension text NOT NULL CHECK (dimension IN ('humano', 'cultura', 'performance')),
  criterion_text text NOT NULL,
  max_score int NOT NULL DEFAULT 3 CHECK (max_score >= 0 AND max_score <= 3),
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supho_certification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('bronze', 'prata', 'ouro')),
  valid_until date,
  maintenance_plan_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_cert_runs_org ON supho_certification_runs(org_id);

CREATE TABLE IF NOT EXISTS supho_certification_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES supho_certification_runs(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES supho_certification_criteria(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 0 AND score <= 3),
  evidence_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supho_cert_evidences_run ON supho_certification_evidences(run_id);

-- RLS (mesmo padrão: acesso por org_id via org_members)
ALTER TABLE supho_diagnostic_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_respondents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_paip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_paip_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_paip_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_paip_krs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_paip_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_ritual_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_ritual_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_certification_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_certification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supho_certification_evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supho_campaigns_select_org"
  ON supho_diagnostic_campaigns FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
CREATE POLICY "supho_campaigns_insert_org"
  ON supho_diagnostic_campaigns FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
CREATE POLICY "supho_campaigns_update_org"
  ON supho_diagnostic_campaigns FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
CREATE POLICY "supho_campaigns_delete_org"
  ON supho_diagnostic_campaigns FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "supho_questions_select_org"
  ON supho_questions FOR SELECT
  USING (org_id IS NULL OR org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
CREATE POLICY "supho_questions_all_org"
  ON supho_questions FOR ALL
  USING (org_id IS NULL OR org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "supho_respondents_via_campaign"
  ON supho_respondents FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM supho_diagnostic_campaigns
      WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
    )
  );

CREATE POLICY "supho_answers_via_respondent"
  ON supho_answers FOR ALL
  USING (
    respondent_id IN (
      SELECT r.id FROM supho_respondents r
      JOIN supho_diagnostic_campaigns c ON c.id = r.campaign_id
      WHERE c.org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())
    )
  );

CREATE POLICY "supho_results_select_org"
  ON supho_diagnostic_results FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));
CREATE POLICY "supho_results_insert_org"
  ON supho_diagnostic_results FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "supho_paip_plans_org"
  ON supho_paip_plans FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "supho_paip_gaps_via_plan"
  ON supho_paip_gaps FOR ALL
  USING (plan_id IN (SELECT id FROM supho_paip_plans WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())));

CREATE POLICY "supho_paip_objectives_via_gap"
  ON supho_paip_objectives FOR ALL
  USING (gap_id IN (SELECT g.id FROM supho_paip_gaps g JOIN supho_paip_plans p ON p.id = g.plan_id WHERE p.org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())));

CREATE POLICY "supho_paip_krs_via_objective"
  ON supho_paip_krs FOR ALL
  USING (objective_id IN (SELECT o.id FROM supho_paip_objectives o JOIN supho_paip_gaps g ON g.id = o.gap_id JOIN supho_paip_plans p ON p.id = g.plan_id WHERE p.org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())));

CREATE POLICY "supho_paip_actions_via_kr"
  ON supho_paip_actions FOR ALL
  USING (kr_id IN (SELECT k.id FROM supho_paip_krs k JOIN supho_paip_objectives o ON o.id = k.objective_id JOIN supho_paip_gaps g ON g.id = o.gap_id JOIN supho_paip_plans p ON p.id = g.plan_id WHERE p.org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())));

CREATE POLICY "supho_ritual_templates_org"
  ON supho_ritual_templates FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "supho_rituals_via_template"
  ON supho_rituals FOR ALL
  USING (template_id IN (SELECT id FROM supho_ritual_templates WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())));

CREATE POLICY "supho_ritual_decisions_via_ritual"
  ON supho_ritual_decisions FOR ALL
  USING (ritual_id IN (SELECT r.id FROM supho_rituals r JOIN supho_ritual_templates t ON t.id = r.template_id WHERE t.org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())));

-- Critérios de certificação: leitura para todos (podem ser seed globais)
CREATE POLICY "supho_cert_criteria_select"
  ON supho_certification_criteria FOR SELECT USING (true);

CREATE POLICY "supho_cert_runs_org"
  ON supho_certification_runs FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id()));

CREATE POLICY "supho_cert_evidences_via_run"
  ON supho_certification_evidences FOR ALL
  USING (run_id IN (SELECT id FROM supho_certification_runs WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = current_user_id())));
