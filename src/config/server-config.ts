import "server-only";

export const PROVIDER_IDS = ["mock"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

/**
 * Everything the server reads from the environment, parsed and checked once.
 * A typo in an env var should fail loudly at startup with a clear message,
 * not surface later as NaN timeouts or a silently disabled cache.
 */
export interface ServerConfig {
  readonly provider: ProviderId;
  /** Artificial delay of the mock provider, to make loading states visible. */
  readonly mockLatencyMs: number;
  /** Deadline for a single provider call before it counts as failed. */
  readonly providerTimeoutMs: number;
  /** Extra attempts after a retryable failure (timeouts, rate limits, 5xx). */
  readonly providerMaxRetries: number;
  /** How long a price may be reused. Short, because prices move; 0 disables caching. */
  readonly quoteCacheTtlSeconds: number;
}

export class ConfigError extends Error {
  constructor(problems: readonly string[]) {
    super(`Invalid server configuration:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
  }
}

export function loadServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const problems: string[] = [];

  const integer = (name: string, fallback: number, min: number, max: number): number => {
    const raw = env[name];
    if (raw === undefined || raw.trim() === "") return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      problems.push(`${name} must be an integer between ${min} and ${max}, got "${raw}"`);
      return fallback;
    }
    return value;
  };

  const providerRaw = env.ACCOMMODATION_PROVIDER?.trim() || "mock";
  const provider = PROVIDER_IDS.find((id) => id === providerRaw);
  if (!provider) problems.push(`ACCOMMODATION_PROVIDER must be one of: ${PROVIDER_IDS.join(", ")}; got "${providerRaw}"`);

  const config: ServerConfig = {
    provider: provider ?? "mock",
    mockLatencyMs: integer("MOCK_PROVIDER_LATENCY_MS", 0, 0, 10_000),
    providerTimeoutMs: integer("PROVIDER_TIMEOUT_MS", 8_000, 100, 60_000),
    providerMaxRetries: integer("PROVIDER_MAX_RETRIES", 2, 0, 5),
    quoteCacheTtlSeconds: integer("QUOTE_CACHE_TTL_SECONDS", 120, 0, 3_600),
  };

  if (problems.length > 0) throw new ConfigError(problems);
  return config;
}
