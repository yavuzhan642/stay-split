import { MockAccommodationProvider } from "./mock/mock-provider";
import type { AccommodationProvider } from "./types";

/**
 * Picks the data source from configuration, so switching to a real provider is
 * an environment change, not a code change. Real integrations get their own
 * case here, reading credentials from env vars; keys are never committed.
 */
export function createAccommodationProvider(env: NodeJS.ProcessEnv = process.env): AccommodationProvider {
  const providerId = env.ACCOMMODATION_PROVIDER ?? "mock";
  switch (providerId) {
    case "mock":
      return new MockAccommodationProvider({ latencyMs: Number(env.MOCK_PROVIDER_LATENCY_MS ?? 0) || 0 });
    default:
      throw new Error(`Unknown ACCOMMODATION_PROVIDER "${providerId}". Supported: mock`);
  }
}
