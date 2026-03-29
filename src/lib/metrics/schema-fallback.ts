/**
 * Quando a migration 020 ainda não foi aplicada, SELECT que inclui `metrics_definition_version` falha.
 * Usado para repetir o pedido sem essa coluna (degradação temporária até `npm run db:migrate`).
 */
export function isMissingMetricsDefinitionColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('metrics_definition_version') ||
    m.includes('42703') ||
    (m.includes('column') && m.includes('does not exist'))
  );
}
