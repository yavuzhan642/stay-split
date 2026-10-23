import { describe, expect, it, vi } from "vitest";
import { ProviderError, type AccommodationProvider } from "@/providers/types";
import { InMemoryProvider, makeProperty, makeQuote } from "@/test/builders";
import { handleSearchRequest, type SearchApiResponse } from "./search-http";

const NOW = new Date("2026-10-24T09:00:00Z");
const QUERY = "city=istanbul&checkIn=2027-01-20&checkOut=2027-01-23&adults=2";
const PROPERTIES = ["A", "B", "C"].map((id) => makeProperty(id));

const briefExample = new InMemoryProvider(PROPERTIES, [
  makeQuote("A", "2027-01-20", "2027-01-23", 4500),
  makeQuote("B", "2027-01-20", "2027-01-21", 900),
  makeQuote("C", "2027-01-21", "2027-01-23", 1800),
]);

function failingProvider(error: unknown): AccommodationProvider {
  return {
    info: { id: "failing", name: "Failing", isDemo: false },
    searchProperties: async () => PROPERTIES,
    getQuotes: async () => {
      throw error;
    },
  };
}

async function call(query: string, provider: AccommodationProvider) {
  const logError = vi.fn();
  const response = await handleSearchRequest(new Request(`http://localhost/api/search?${query}`), {
    provider,
    now: NOW,
    logError,
  });
  return { response, body: (await response.json()) as SearchApiResponse, logError };
}

describe("GET /api/search", () => {
  it("returns the search result as JSON", async () => {
    const { response, body } = await call(QUERY, briefExample);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
    expect("data" in body && body.data.recommendation).toMatchObject({
      kind: "split",
      reason: "split-saves-money",
      savings: { amount: { amount: 180_000, currency: "TRY" }, percent: 40 },
    });
  });

  it("explains an invalid query field by field with 400", async () => {
    const { response, body } = await call("city=paris&checkIn=2027-01-20&checkOut=2027-01-18&adults=2", briefExample);
    expect(response.status).toBe(400);
    expect("error" in body && body.error.code).toBe("INVALID_QUERY");
    expect("error" in body && body.error.issues?.map((issue) => issue.field)).toEqual(["cityId", "checkOut"]);
  });

  it("asks the client to retry later when the provider is temporarily down", async () => {
    const { response, body, logError } = await call(
      QUERY,
      failingProvider(new ProviderError("failing", "rate limited", { retryable: true })),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect("error" in body && body.error.code).toBe("PROVIDER_UNAVAILABLE");
    expect(logError).toHaveBeenCalledWith("search.provider_failed", expect.objectContaining({ retryable: true }));
  });

  it("returns 502 when retrying would not help", async () => {
    const { response, body } = await call(QUERY, failingProvider(new ProviderError("failing", "invalid API key")));
    expect(response.status).toBe(502);
    expect("error" in body && body.error.code).toBe("PROVIDER_ERROR");
  });

  it("hides internal details behind a generic 500", async () => {
    // A provider returning garbage makes the engine itself fail: a bug, not an outage.
    const garbage: AccommodationProvider = {
      ...failingProvider(null),
      getQuotes: async () => null as never,
    };
    const { response, body, logError } = await call(QUERY, garbage);
    expect(response.status).toBe(500);
    expect(body).toEqual({ error: { code: "INTERNAL", message: "Beklenmeyen bir hata oluştu." } });
    expect(logError).toHaveBeenCalledWith("search.unexpected_error", expect.any(Object));
  });
});
