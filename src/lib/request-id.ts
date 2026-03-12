import { headers } from 'next/headers';

const REQUEST_ID_HEADER = 'x-request-id';

export async function getRequestId(): Promise<string | null> {
  const h = await headers();
  return h.get(REQUEST_ID_HEADER) ?? null;
}

/** Formato de log estruturado para APIs (inclui request_id quando disponível). */
export function logApi(
  level: 'warn' | 'error' | 'info',
  message: string,
  requestId: string | null,
  meta?: Record<string, unknown>
): void {
  const payload = { level, message, request_id: requestId, ...meta };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
