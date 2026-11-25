const NETWORK_MESSAGE = "We couldn't reach TrueStars. Check your internet connection and try again.";

export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function postJson<T>(
  url: string,
  body: unknown,
  options: { signal?: AbortSignal; baseUrl?: string; timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const { signal, baseUrl = "", timeoutMs = 45_000, retries = 1 } = options;
  let lastError: Error = new RequestError(NETWORK_MESSAGE, 0);

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const res = await fetch(baseUrl + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: combined,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data as T;
      lastError = new RequestError(data.error ?? `Request failed (${res.status})`, res.status);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === retries) throw lastError;
      await wait(res.status === 429 ? 2500 : 800);
    } catch (e) {
      if (signal?.aborted) throw e;
      if (e instanceof RequestError) throw e;
      lastError = new RequestError(
        timeout.aborted ? "TrueStars took too long to answer. Please try again." : NETWORK_MESSAGE,
        0,
      );
      if (attempt === retries) throw lastError;
      await wait(800);
    }
  }
  throw lastError;
}
