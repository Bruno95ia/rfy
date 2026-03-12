/**
 * Rate limiting para endpoints sensíveis (webhook, upload).
 * Usa Upstash Redis quando configurado. Sem UPSTASH_*, não aplica limite.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 req/min por identificador
    analytics: true,
  });
  return ratelimit;
}

/**
 * Verifica rate limit. Retorna { limited: true } se excedeu, { limited: false } se OK.
 * identifier: IP ou orgId (header x-forwarded-for, ou similar)
 */
export async function checkRateLimit(identifier: string): Promise<{ limited: boolean }> {
  const rl = getRatelimit();
  if (!rl) return { limited: false };
  const { success } = await rl.limit(identifier);
  return { limited: !success };
}

/**
 * Rate limit por organização (para quotas por feature). Use em rotas que têm org_id.
 * identifier: org:{orgId}:{action} ex.: org:uuid:upload
 */
export async function checkRateLimitByOrg(
  orgId: string,
  action: string
): Promise<{ limited: boolean }> {
  return checkRateLimit(`org:${orgId}:${action}`);
}
