import type { AccommodationProvider, ProviderLimits, QuoteRequest } from "../types";

/**
 * Splits a quote request that exceeds the provider's limits into chunks
 * (properties × stays) and runs at most `maxConcurrentRequests` at a time.
 * If one chunk fails, the others are cancelled: the search fails as a whole
 * rather than returning a silently incomplete price list.
 */
export function withBatching(inner: AccommodationProvider, limits: ProviderLimits): AccommodationProvider {
  return {
    info: inner.info,
    limits: inner.limits,
    searchProperties: (criteria, options) => inner.searchProperties(criteria, options),
    async getQuotes(request, options) {
      const chunks = splitRequest(request, limits);
      if (chunks.length <= 1) return inner.getQuotes(request, options);

      const controller = new AbortController();
      const forwardAbort = () => controller.abort(options?.signal?.reason);
      options?.signal?.addEventListener("abort", forwardAbort, { once: true });
      try {
        const results = await mapWithConcurrency(
          chunks,
          limits.maxConcurrentRequests,
          (chunk) => inner.getQuotes(chunk, { ...options, signal: controller.signal }),
          controller.signal,
        );
        return results.flat();
      } catch (error) {
        controller.abort(error);
        throw error;
      } finally {
        options?.signal?.removeEventListener("abort", forwardAbort);
      }
    },
  };
}

export function splitRequest(request: QuoteRequest, limits: ProviderLimits): QuoteRequest[] {
  const chunks: QuoteRequest[] = [];
  for (const propertyIds of chunk(request.propertyIds, limits.maxPropertiesPerRequest)) {
    for (const stays of chunk(request.stays, limits.maxStaysPerRequest)) {
      chunks.push({ ...request, propertyIds, stays });
    }
  }
  return chunks;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Like Promise.all over `items.map(fn)`, but with at most `limit` calls in flight; stops starting new ones once aborted. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length && !signal?.aborted) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
