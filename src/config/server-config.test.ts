import { describe, expect, it } from "vitest";
import { ConfigError, loadServerConfig } from "./server-config";

describe("loadServerConfig", () => {
  it("falls back to safe defaults", () => {
    expect(loadServerConfig({})).toEqual({
      provider: "mock",
      mockLatencyMs: 0,
      providerTimeoutMs: 8_000,
      providerMaxRetries: 2,
      quoteCacheTtlSeconds: 120,
    });
  });

  it("reads valid values", () => {
    expect(
      loadServerConfig({
        ACCOMMODATION_PROVIDER: "mock",
        MOCK_PROVIDER_LATENCY_MS: "400",
        PROVIDER_TIMEOUT_MS: "3000",
        PROVIDER_MAX_RETRIES: "0",
        QUOTE_CACHE_TTL_SECONDS: "0",
      }),
    ).toMatchObject({ mockLatencyMs: 400, providerTimeoutMs: 3_000, providerMaxRetries: 0, quoteCacheTtlSeconds: 0 });
  });

  it("reports every invalid value at once instead of running with a broken setup", () => {
    const load = () =>
      loadServerConfig({ ACCOMMODATION_PROVIDER: "booking", PROVIDER_TIMEOUT_MS: "fast", PROVIDER_MAX_RETRIES: "99" });
    expect(load).toThrow(ConfigError);
    expect(load).toThrow(/ACCOMMODATION_PROVIDER[\s\S]*PROVIDER_TIMEOUT_MS[\s\S]*PROVIDER_MAX_RETRIES/);
  });
});
