/**
 * Retry com backoff exponencial para operações de rede (emails, webhooks).
 */

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseMs?: number; maxMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, baseMs = 1000, maxMs = 10000 } = options;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts) break;
      const delay = Math.min(baseMs * Math.pow(2, attempt - 1), maxMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
