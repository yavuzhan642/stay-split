export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Seconds until the next request would be allowed (0 when allowed). */
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  check(clientKey: string): RateLimitDecision;
}

export interface RateLimiterOptions {
  /** Requests a client may make per window, and also the burst it may make at once. */
  readonly limit: number;
  readonly windowMs: number;
  /** Upper bound on tracked clients; the least recently seen are forgotten first. */
  readonly maxClients?: number;
  readonly now?: () => number;
}

/**
 * Token bucket per client: each client has `limit` tokens that refill
 * continuously over `windowMs`, and every request spends one. Unlike a fixed
 * "N per minute" window, there is no edge at which a client can fire 2N
 * requests in a row.
 *
 * Protects the provider quota behind a public endpoint. State lives in this
 * process, so with several server instances each enforces its own budget;
 * a shared store (e.g. Redis) makes it global.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs, maxClients = 10_000, now = Date.now } = options;
  const refillPerMs = limit / windowMs;
  const buckets = new Map<string, { tokens: number; updatedAt: number }>();

  return {
    check(clientKey) {
      const time = now();
      const previous = buckets.get(clientKey);
      const tokens = previous
        ? Math.min(limit, previous.tokens + (time - previous.updatedAt) * refillPerMs)
        : limit;

      buckets.delete(clientKey); // re-insert below: most recently seen goes last
      if (buckets.size >= maxClients) {
        const oldest = buckets.keys().next().value;
        if (oldest !== undefined) buckets.delete(oldest);
      }

      if (tokens >= 1) {
        buckets.set(clientKey, { tokens: tokens - 1, updatedAt: time });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      buckets.set(clientKey, { tokens, updatedAt: time });
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((1 - tokens) / refillPerMs / 1000)) };
    },
  };
}

/**
 * Who is calling. On Vercel and most managed platforms the proxy sets
 * x-forwarded-for itself; behind a self-hosted proxy, make sure it overwrites
 * the header rather than passing a client-supplied value through.
 */
export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}
