import { ProviderError, type AccommodationProvider, type ProviderCallOptions } from "../types";

/**
 * Gives every provider call a deadline. A slow upstream must not hold a user's
 * search (and a server worker) hostage; after `timeoutMs` the call fails with a
 * retryable ProviderError and the inner request is aborted.
 */
export function withTimeout(inner: AccommodationProvider, { timeoutMs }: { timeoutMs: number }): AccommodationProvider {
  const run = <T>(options: ProviderCallOptions | undefined, call: (options: ProviderCallOptions) => Promise<T>) =>
    withDeadline(inner.info.id, timeoutMs, options?.signal, (signal) => call({ ...options, signal }));

  return {
    info: inner.info,
    limits: inner.limits,
    searchProperties: (criteria, options) => run(options, (o) => inner.searchProperties(criteria, o)),
    getQuotes: (request, options) => run(options, (o) => inner.getQuotes(request, o)),
  };
}

async function withDeadline<T>(
  providerId: string,
  timeoutMs: number,
  outer: AbortSignal | undefined,
  call: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  outer?.throwIfAborted();
  const controller = new AbortController();
  const timeoutError = new ProviderError(providerId, `No response within ${timeoutMs} ms`, { retryable: true });
  const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);
  const forwardAbort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", forwardAbort, { once: true });

  try {
    // Race the call against the abort as well, in case the provider ignores its signal.
    return await new Promise<T>((resolve, reject) => {
      controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
      call(controller.signal).then(resolve, reject);
    });
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", forwardAbort);
  }
}
