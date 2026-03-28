-- Versão semântica das definições usadas ao calcular snapshot/frictions/pilares (alinhada a METRICS_DEFINITION_VERSION no código).

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS metrics_definition_version text NOT NULL DEFAULT '1.0.0';

COMMENT ON COLUMN reports.metrics_definition_version IS 'Semver das regras de métricas RFY usadas neste snapshot; ver docs/METRICAS_RFY_DEFINICOES.md e src/lib/metrics/definitions.ts';
