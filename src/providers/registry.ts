import "server-only";
import { loadServerConfig, type ServerConfig } from "@/config/server-config";
import { MockAccommodationProvider } from "./mock/mock-provider";
import { createResilientProvider } from "./resilience/pipeline";
import type { AccommodationProvider } from "./types";

let shared: AccommodationProvider | undefined;

/**
 * The provider for this server process. Shared, so that its quote cache
 * outlives a single request. `server-only` makes the build fail if this is
 * ever imported from browser code, which is where API keys would leak.
 */
export function getAccommodationProvider(): AccommodationProvider {
  shared ??= createAccommodationProvider(loadServerConfig());
  return shared;
}

/**
 * Picks the data source from configuration, so switching to a real provider
 * is an environment change, not a code change. A real integration gets its
 * own case here and reads its credentials from env vars; keys are never committed.
 */
export function createAccommodationProvider(config: ServerConfig): AccommodationProvider {
  return createResilientProvider(createAdapter(config), {
    timeoutMs: config.providerTimeoutMs,
    maxRetries: config.providerMaxRetries,
    cacheTtlMs: config.quoteCacheTtlSeconds * 1000,
  });
}

function createAdapter(config: ServerConfig): AccommodationProvider {
  switch (config.provider) {
    case "mock":
      return new MockAccommodationProvider({ latencyMs: config.mockLatencyMs });
  }
}
