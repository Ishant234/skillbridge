// lib/fetchWithRetry.ts — Wrapper for Next.js → FastAPI calls with timeout + 1 retry
// As specified in §9 of the README spec.

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retries = 1
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    if (retries > 0) {
      console.warn(`[fetchWithRetry] Request to ${url} failed, retrying once...`, err);
      return await attempt();
    }
    throw err;
  }
}
