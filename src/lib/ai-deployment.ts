/**
 * Indica se o deployment considera o serviço de IA “configurado” para o badge na AppShell:
 * - URL explícita em AI_SERVICE_URL, ou
 * - ambiente de desenvolvimento (o runtime usa o default localhost:8001, mesmo sem env).
 * Em produção sem URL definida, o badge reflete que não há serviço explícito (ainda que o código faça fallback interno).
 */
export function isAiServiceConfigured(): boolean {
  const explicit = process.env.AI_SERVICE_URL?.trim();
  if (explicit) return true;
  return process.env.NODE_ENV === 'development';
}

/** Base URL efetiva do AI service — alinhar novas chamadas ao mesmo critério das rotas /api/ai/*. */
export function getEffectiveAiServiceUrl(): string {
  return process.env.AI_SERVICE_URL?.trim() || 'http://localhost:8001';
}
