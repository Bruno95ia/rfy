-- RFY Impact Layer: persistir impacto causal + campos PAIP (previsão de ganho)

ALTER TABLE supho_diagnostic_results
  ADD COLUMN IF NOT EXISTS impact_json jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN supho_diagnostic_results.impact_json IS
  'ImpactResult + detalhes por pilar (gerado pelo Impact Engine ao computar diagnóstico)';

ALTER TABLE supho_paip_actions
  ADD COLUMN IF NOT EXISTS pillar text CHECK (
    pillar IS NULL OR pillar IN ('culture', 'commercial', 'people')
  );

ALTER TABLE supho_paip_actions
  ADD COLUMN IF NOT EXISTS expected_impact_rfy numeric;

ALTER TABLE supho_paip_actions
  ADD COLUMN IF NOT EXISTS expected_revenue_gain numeric;

COMMENT ON COLUMN supho_paip_actions.pillar IS 'Pilar SUPHO alinhado à ação (cultura, comercial, pessoas)';
COMMENT ON COLUMN supho_paip_actions.expected_impact_rfy IS 'Delta esperado no score RFY (0–1)';
COMMENT ON COLUMN supho_paip_actions.expected_revenue_gain IS 'Ganho de receita mensal estimado (R$)';
