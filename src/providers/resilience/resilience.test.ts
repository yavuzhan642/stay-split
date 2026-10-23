import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, toIsoDate } from "@/domain/dates";
import type { StayInterval, StayQuote } from "@/domain/quote";
import { searchStays } from "@/services/search-stays";
import { makeProperty, makeQuery, makeQuote } from "@/test/builders";
import { MockAccommodationProvider } from "../mock/mock-provider";
import { ProviderError, type AccommodationProvider, type QuoteRequest } from "../types";
import { withBatching } from "./batching";
import { createResilientProvider } from "./pipeline";
import { withQuoteCache } from "./quote-cache";
import { withRetry } from "./retry";
import { withTimeout } from "./timeout";

const CHECK_IN = toIsoDate("2027-01-20");
const stays = (count: number): StayInterval[] =>
  Array.from({ length: count }, (_, i) => ({ checkIn: addDays(CHECK_IN, i), checkOut: addDays(CHECK_IN, i + 1) }));
const request = (propertyIds: string[], stayList: StayInterval[] = stays(1)): QuoteRequest => ({
  propertyIds,
  stays: stayList,
  adults: 2,
  currency: "TRY",
});
/** One quote per requested (property, stay), like a fully available hotel market. */
const quoteAll = async (r: QuoteRequest): Promise<StayQuote[]> =>
  r.propertyIds.flatMap((id) => r.stays.map((s) => makeQuote(id, s.checkIn, s.checkOut, 1000)));

function fake(getQuotes: AccommodationProvider["getQuotes"], extra: Partial<AccommodationProvider> = {}): AccommodationProvider {
  return {
    info: { id: "fake", name: "Fake", isDemo: true },
    searchProperties: async () => [makeProperty("A")],
    getQuotes,
    ...extra,
  };
}
const temporaryFailure = () => new ProviderError("fake", "upstream returned 503", { retryable: true });

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fails a slow call with a retryable ProviderError and aborts it upstream", async () => {
    let upstreamSignal: AbortSignal | undefined;
    const slow = fake((_, options) => {
      upstreamSignal = options?.signal;
      return new Promise(() => {});
    });
    const pending = withTimeout(slow, { timeoutMs: 1_000 }).getQuotes(request(["A"]));
    const outcome = expect(pending).rejects.toMatchObject({ name: "ProviderError", retryable: true });
    await vi.advanceTimersByTimeAsync(1_000);
    await outcome;
    expect(upstreamSignal?.aborted).toBe(true);
  });

  it("lets fast answers through", async () => {
    const quotes = await withTimeout(fake(quoteAll), { timeoutMs: 1_000 }).getQuotes(request(["A"]));
    expect(quotes).toHaveLength(1);
  });

  it("reports a caller's abort as an abort, not as a provider timeout", async () => {
    const controller = new AbortController();
    const pending = withTimeout(fake(() => new Promise(() => {})), { timeoutMs: 1_000 }).getQuotes(request(["A"]), {
      signal: controller.signal,
    });
    controller.abort(new Error("user navigated away"));
    await expect(pending).rejects.toThrow("user navigated away");
  });
});

describe("withRetry", () => {
  const recordSleeps = () => {
    const sleeps: number[] = [];
    return { sleeps, sleep: async (ms: number) => void sleeps.push(ms) };
  };

  it("retries temporary failures with exponentially growing waits", async () => {
    let calls = 0;
    const flaky = fake(async (r) => {
      calls++;
      if (calls < 3) throw temporaryFailure();
      return quoteAll(r);
    });
    const { sleeps, sleep } = recordSleeps();
    const provider = withRetry(flaky, { maxRetries: 3, baseDelayMs: 100, random: () => 1, sleep });

    await expect(provider.getQuotes(request(["A"]))).resolves.toHaveLength(1);
    expect(calls).toBe(3);
    expect(sleeps).toEqual([100, 200]);
  });

  it("caps the wait and gives up after maxRetries", async () => {
    let calls = 0;
    const down = fake(async () => {
      calls++;
      throw temporaryFailure();
    });
    const { sleeps, sleep } = recordSleeps();
    const provider = withRetry(down, { maxRetries: 4, baseDelayMs: 100, maxDelayMs: 250, random: () => 1, sleep });

    await expect(provider.getQuotes(request(["A"]))).rejects.toBeInstanceOf(ProviderError);
    expect(calls).toBe(5);
    expect(sleeps).toEqual([100, 200, 250, 250]);
  });

  it("never retries errors that retrying cannot fix", async () => {
    for (const error of [new ProviderError("fake", "invalid API key"), new TypeError("bug")]) {
      let calls = 0;
      const broken = fake(async () => {
        calls++;
        throw error;
      });
      await expect(withRetry(broken, { maxRetries: 3, sleep: async () => {} }).getQuotes(request(["A"]))).rejects.toBe(error);
      expect(calls).toBe(1);
    }
  });

  it("stops once the caller has given up", async () => {
    const controller = new AbortController();
    let calls = 0;
    const down = fake(async () => {
      calls++;
      controller.abort();
      throw temporaryFailure();
    });
    await expect(
      withRetry(down, { maxRetries: 3, sleep: async () => {} }).getQuotes(request(["A"]), { signal: controller.signal }),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(calls).toBe(1);
  });
});

describe("withBatching", () => {
  const limits = { maxPropertiesPerRequest: 2, maxStaysPerRequest: 3, maxConcurrentRequests: 2 };

  it("splits oversized requests to fit the provider's limits and merges the answers", async () => {
    const seen: QuoteRequest[] = [];
    const provider = withBatching(
      fake(async (r) => {
        seen.push(r);
        return quoteAll(r);
      }),
      limits,
    );
    const quotes = await provider.getQuotes(request(["A", "B", "C", "D", "E"], stays(7)));

    expect(seen).toHaveLength(3 * 3); // ⌈5/2⌉ property chunks × ⌈7/3⌉ stay chunks
    expect(seen.every((r) => r.propertyIds.length <= 2 && r.stays.length <= 3)).toBe(true);
    expect(quotes).toHaveLength(5 * 7);
  });

  it("never has more requests in flight than allowed", async () => {
    let inFlight = 0;
    let peak = 0;
    const provider = withBatching(
      fake(async (r) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 2));
        inFlight--;
        return quoteAll(r);
      }),
      limits,
    );
    await provider.getQuotes(request(["A", "B", "C", "D", "E", "F"], stays(6)));
    expect(peak).toBe(2);
  });

  it("cancels the remaining chunks when one fails", async () => {
    const signals: AbortSignal[] = [];
    const provider = withBatching(
      fake(async (r, options) => {
        signals.push(options!.signal!);
        if (r.propertyIds[0] === "A") throw new ProviderError("fake", "bad chunk");
        await new Promise((resolve) => setTimeout(resolve, 5));
        return quoteAll(r);
      }),
      { ...limits, maxStaysPerRequest: 10 },
    );
    await expect(provider.getQuotes(request(["A", "B", "C", "D", "E", "F"]))).rejects.toThrow("bad chunk");
    expect(signals.length).toBeLessThan(3);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("passes requests within the limits through untouched", async () => {
    const seen: QuoteRequest[] = [];
    const small = request(["A", "B"], stays(3));
    await withBatching(
      fake(async (r) => {
        seen.push(r);
        return [];
      }),
      limits,
    ).getQuotes(small);
    expect(seen).toEqual([small]);
  });
});

describe("withQuoteCache", () => {
  function counting(getQuotes: AccommodationProvider["getQuotes"] = quoteAll) {
    const calls: QuoteRequest[] = [];
    const inner = fake(async (r, options) => {
      calls.push(r);
      return getQuotes(r, options);
    });
    return { inner, calls };
  }

  it("answers a repeated request without calling the provider again", async () => {
    const { inner, calls } = counting();
    const provider = withQuoteCache(inner, { ttlMs: 60_000 });
    const first = await provider.getQuotes(request(["A", "B"], stays(3)));
    const second = await provider.getQuotes(request(["A", "B"], stays(3)));
    expect(calls).toHaveLength(1);
    expect(second).toHaveLength(first.length);
    expect(second).toEqual(expect.arrayContaining(first));
  });

  it("remembers that a stay is not bookable", async () => {
    const { inner, calls } = counting(async () => []);
    const provider = withQuoteCache(inner, { ttlMs: 60_000 });
    await provider.getQuotes(request(["A"]));
    await expect(provider.getQuotes(request(["A"]))).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("asks only for what it does not know yet, in a single request", async () => {
    const { inner, calls } = counting();
    const provider = withQuoteCache(inner, { ttlMs: 60_000 });
    const [first, second, third] = stays(3);
    await provider.getQuotes(request(["A", "B"], [first!]));
    const quotes = await provider.getQuotes(request(["A", "B"], [first!, second!, third!]));

    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ propertyIds: ["A", "B"], stays: [second, third] });
    expect(quotes).toHaveLength(6);
  });

  it("keeps every quote the provider returned for a stay, e.g. several room types", async () => {
    const { inner } = counting(async (r) => [...(await quoteAll(r)), ...(await quoteAll(r)).map((q) => ({ ...q, id: `${q.id}:suite` }))]);
    const provider = withQuoteCache(inner, { ttlMs: 60_000 });
    await provider.getQuotes(request(["A"]));
    await expect(provider.getQuotes(request(["A"]))).resolves.toHaveLength(2);
  });

  it("forgets answers after the TTL", async () => {
    let now = 0;
    const { inner, calls } = counting();
    const provider = withQuoteCache(inner, { ttlMs: 1_000, now: () => now });
    await provider.getQuotes(request(["A"]));
    now = 999;
    await provider.getQuotes(request(["A"]));
    now = 1_000;
    await provider.getQuotes(request(["A"]));
    expect(calls).toHaveLength(2);
  });

  it("drops the least recently used entries when full", async () => {
    const { inner, calls } = counting();
    const provider = withQuoteCache(inner, { ttlMs: 60_000, maxEntries: 2 });
    for (const id of ["A", "B", "A", "C", "A", "B"]) await provider.getQuotes(request([id]));
    // A stays hot; B was the least recently used when C arrived, so B is fetched again.
    expect(calls.map((r) => r.propertyIds[0])).toEqual(["A", "B", "C", "B"]);
  });

  it("caches property searches too", async () => {
    let calls = 0;
    const provider = withQuoteCache(
      fake(quoteAll, {
        searchProperties: async () => {
          calls++;
          return [makeProperty("A")];
        },
      }),
      { ttlMs: 60_000 },
    );
    const criteria = { cityId: "istanbul", adults: 2, propertyTypes: ["hotel", "apartment"] as const };
    await provider.searchProperties(criteria);
    await provider.searchProperties({ ...criteria, propertyTypes: ["apartment", "hotel"] });
    expect(calls).toBe(1);
  });
});

describe("createResilientProvider", () => {
  it("delivers complete results from a flaky, size-limited upstream, then serves repeats from cache", async () => {
    const failedOnce = new Set<string>();
    let upstreamCalls = 0;
    const adapter = fake(
      async (r) => {
        upstreamCalls++;
        const chunk = `${r.propertyIds.join()}|${r.stays.map((s) => s.checkIn).join()}`;
        if (!failedOnce.has(chunk)) {
          failedOnce.add(chunk);
          throw temporaryFailure();
        }
        return quoteAll(r);
      },
      { limits: { maxPropertiesPerRequest: 2, maxStaysPerRequest: 2, maxConcurrentRequests: 2 } },
    );
    const provider = createResilientProvider(adapter, { timeoutMs: 1_000, maxRetries: 2, cacheTtlMs: 60_000 });

    const quotes = await provider.getQuotes(request(["A", "B", "C"], stays(4)));
    expect(quotes).toHaveLength(3 * 4);
    expect(upstreamCalls).toBe(2 * 2 * 2); // 4 chunks, each failing once before succeeding

    await provider.getQuotes(request(["A", "B", "C"], stays(4)));
    expect(upstreamCalls).toBe(8);
  });

  it("does not change what a search finds", async () => {
    const query = makeQuery({ cityId: "rome", checkIn: toIsoDate("2027-05-12"), checkOut: toIsoDate("2027-05-17") });
    const direct = await searchStays(query, { provider: new MockAccommodationProvider() });
    const resilient = createResilientProvider(new MockAccommodationProvider(), {
      timeoutMs: 1_000,
      maxRetries: 2,
      cacheTtlMs: 60_000,
    });
    const viaPipeline = await searchStays(query, { provider: resilient });
    const cached = await searchStays(query, { provider: resilient });

    for (const result of [viaPipeline, cached]) {
      expect(result.alternatives.map((plan) => plan.id)).toEqual(direct.alternatives.map((plan) => plan.id));
      expect(result.recommendation).toEqual(direct.recommendation);
    }
  });
});
