import { ProviderError, type AccommodationProvider } from "../types";

export interface RetryOptions {
  /** Extra attempts after the first one. */
  readonly maxRetries: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  /** Injected in tests to avoid real waiting and randomness. */
  readonly sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  readonly random?: () => number;
}

/**
 * Retries calls that failed for a temporary reason (ProviderError with
 * `retryable`), never for bad requests or bugs, and never after the caller
 * gave up. Waits use exponential backoff with "full jitter": a random delay in
 * [0, base·2^attempt]. Without jitter, every client that hit the same outage
 * retries at the same instant and knocks the recovering API over again.
 */
export function withRetry(inner: AccommodationProvider, options: RetryOptions): AccommodationProvider {
  const { maxRetries, baseDelayMs = 200, maxDelayMs = 2_000, sleep = defaultSleep, random = Math.random } = options;

  async function run<T>(signal: AbortSignal | undefined, call: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await call();
      } catch (error) {
        const retryable = error instanceof ProviderError && error.retryable;
        if (!retryable || attempt >= maxRetries || signal?.aborted) throw error;
        const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
        await sleep(Math.round(random() * ceiling), signal);
      }
    }
  }

  return {
    info: inner.info,
    limits: inner.limits,
    searchProperties: (criteria, callOptions) => run(callOptions?.signal, () => inner.searchProperties(criteria, callOptions)),
    getQuotes: (request, callOptions) => run(callOptions?.signal, () => inner.getQuotes(request, callOptions)),
  };
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
