-- Síntese dos documentos do repositório Conhecimento por campanha (para o diagnóstico SUPHO)
ALTER TABLE supho_diagnostic_campaigns
  ADD COLUMN IF NOT EXISTS uploads_context_markdown text,
  ADD COLUMN IF NOT EXISTS uploads_context_updated_at timestamptz;

COMMENT ON COLUMN supho_diagnostic_campaigns.uploads_context_markdown IS 'Síntese dos uploads (texto/IA) associada à campanha; antecede o bundle de conhecimento no cálculo.';
COMMENT ON COLUMN supho_diagnostic_campaigns.uploads_context_updated_at IS 'Última geração da síntese de uploads.';
