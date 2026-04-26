-- PAIP: permitir pilar "leadership" (IH) além de people legado

ALTER TABLE supho_paip_actions DROP CONSTRAINT IF EXISTS supho_paip_actions_pillar_check;

ALTER TABLE supho_paip_actions
  ADD CONSTRAINT supho_paip_actions_pillar_check
  CHECK (
    pillar IS NULL OR pillar IN ('culture', 'commercial', 'people', 'leadership')
  );

COMMENT ON COLUMN supho_paip_actions.pillar IS
  'Pilar: cultura, comercial, pessoas (legado) ou liderança (IH)';
