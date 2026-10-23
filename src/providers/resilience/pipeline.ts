import type { AccommodationProvider } from "../types";
import { withBatching } from "./batching";
import { withQuoteCache } from "./quote-cache";
import { withRetry } from "./retry";
import { withTimeout } from "./timeout";

export interface ResilienceOptions {
  readonly timeoutMs: number;
  readonly maxRetries: number;
  /** 0 disables caching. */
  readonly cacheTtlMs: number;
}

/**
 * Wraps a provider adapter in the layers every real integration needs. Each
 * layer implements AccommodationProvider itself (the decorator pattern), so
 * they stack in any order and the search service never knows they exist.
 *
 *   cache → batching → retry → timeout → adapter
 *
 * The order matters: the cache answers before any network work happens;
 * batching splits a big request first, so each chunk is retried on its own;
 * retry sits outside timeout, so every attempt gets a fresh deadline.
 */
export function createResilientProvider(adapter: AccommodationProvider, options: ResilienceOptions): AccommodationProvider {
  let provider = withTimeout(adapter, { timeoutMs: options.timeoutMs });
  provider = withRetry(provider, { maxRetries: options.maxRetries });
  if (adapter.limits) provider = withBatching(provider, adapter.limits);
  if (options.cacheTtlMs > 0) provider = withQuoteCache(provider, { ttlMs: options.cacheTtlMs });
  return provider;
}
