/**
 * Indica se a camada de IA está configurada no ambiente (sem health check HTTP).
 * Usado pelo AppShell para o badge da top bar.
 */
export function isAiLayerConfigured(): boolean {
  if (process.env.OPENAI_API_KEY?.trim()) return true;
  if (process.env.AI_SERVICE_URL?.trim()) return true;
  return false;
}
