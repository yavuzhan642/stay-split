import type { Property } from "@/domain/property";
import type { StayInterval, StayQuote } from "@/domain/quote";
import type { AccommodationProvider, PropertySearchCriteria, QuoteRequest } from "../types";

export interface QuoteCacheOptions {
  /** How long an answer may be reused. Prices move, so keep this short (minutes). */
  readonly ttlMs: number;
  /** Upper bound on memory: the least recently used entries are dropped first. */
  readonly maxEntries?: number;
  readonly now?: () => number;
}

/**
 * Reuses recent provider answers. Real availability APIs are slow and
 * rate-limited, and users often repeat or tweak a search (another budget,
 * transfer on/off) that needs exactly the same prices.
 *
 * Caching is per (property, stay, guests, currency), not per request, so a
 * search for 20–24 Jan also warms 20–22 Jan. "No quote" (= not bookable) is
 * cached too: otherwise sold-out combinations would be asked for every time.
 * Cached quotes keep their original `retrievedAt`, so their age stays honest.
 *
 * The cache lives in this server process. On serverless hosting each instance
 * has its own; a shared store (e.g. Redis) is the next step at scale.
 */
export function withQuoteCache(inner: AccommodationProvider, options: QuoteCacheOptions): AccommodationProvider {
  const now = options.now ?? Date.now;
  const quotes = new TtlCache<readonly StayQuote[]>(options.ttlMs, options.maxEntries ?? 50_000, now);
  const properties = new TtlCache<Property[]>(options.ttlMs, 1_000, now);

  return {
    info: inner.info,
    limits: inner.limits,

    async searchProperties(criteria, callOptions) {
      const key = propertiesKey(criteria);
      const cached = properties.get(key);
      if (cached) return cached;
      const fresh = await inner.searchProperties(criteria, callOptions);
      properties.set(key, fresh);
      return fresh;
    },

    async getQuotes(request, callOptions) {
      const result: StayQuote[] = [];
      // Stays that miss the same set of properties are fetched together,
      // so a cold cache still costs a single upstream request.
      const groups = new Map<string, { propertyIds: string[]; stays: StayInterval[] }>();

      for (const stay of request.stays) {
        const missing: string[] = [];
        for (const propertyId of request.propertyIds) {
          const cached = quotes.get(quoteKey(request, propertyId, stay));
          if (cached) result.push(...cached);
          else missing.push(propertyId);
        }
        if (missing.length === 0) continue;
        const groupKey = missing.join("\u0000");
        const group = groups.get(groupKey) ?? { propertyIds: missing, stays: [] };
        group.stays.push(stay);
        groups.set(groupKey, group);
      }

      const fetched = await Promise.all(
        [...groups.values()].map(async (group) => {
          const answer = await inner.getQuotes({ ...request, ...group }, callOptions);
          const byKey = new Map<string, StayQuote[]>();
          for (const quote of answer) {
            const key = quoteKey(request, quote.propertyId, quote);
            byKey.set(key, [...(byKey.get(key) ?? []), quote]);
          }
          for (const stay of group.stays) {
            for (const propertyId of group.propertyIds) {
              const key = quoteKey(request, propertyId, stay);
              quotes.set(key, byKey.get(key) ?? []);
            }
          }
          return answer;
        }),
      );

      return [...result, ...fetched.flat()];
    },
  };
}

function quoteKey(request: QuoteRequest, propertyId: string, stay: StayInterval): string {
  return [propertyId, stay.checkIn, stay.checkOut, request.adults, request.currency].join("|");
}

function propertiesKey(criteria: PropertySearchCriteria): string {
  return [criteria.cityId, criteria.adults, [...criteria.propertyTypes].sort().join(",")].join("|");
}

/** A Map with per-entry expiry and least-recently-used eviction (Map keeps insertion order). */
class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    if (entry.expiresAt <= this.now()) return undefined;
    this.entries.set(key, entry); // re-insert: now the most recently used
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
