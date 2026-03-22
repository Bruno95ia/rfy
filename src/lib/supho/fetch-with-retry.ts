/**
 * Fetch JSON com re-tentativas leves para falhas transitórias (5xx ou rede).
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJsonWithRetry<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: { stepLabel: string; retries?: number }
): Promise<{ res: Response; data: T }> {
  const retries = options.retries ?? 2;
  const label = options.stepLabel;
  let lastNetwork: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      const data = (await res.json().catch(() => ({}))) as T;
      if (!res.ok && res.status >= 500 && attempt < retries) {
        await delay(280 * (attempt + 1));
        continue;
      }
      return { res, data };
    } catch (e) {
      lastNetwork = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        await delay(280 * (attempt + 1));
        continue;
      }
    }
  }

  throw new Error(
    `${label}: falha de rede após ${retries + 1} tentativa(s)${lastNetwork ? ` — ${lastNetwork.message}` : ''}`
  );
}
