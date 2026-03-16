-- Perguntas opcionais por campanha: se preenchido, apenas essas IDs são usadas no formulário e nas respostas.
-- NULL = todas as perguntas (global + org) como antes.
ALTER TABLE supho_diagnostic_campaigns
  ADD COLUMN IF NOT EXISTS question_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN supho_diagnostic_campaigns.question_ids IS 'IDs das perguntas permitidas nesta campanha; NULL = todas (global + org).';
