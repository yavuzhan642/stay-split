import { describe, expect, it } from "vitest";
import { clientKeyFromRequest, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows a burst up to the limit, then asks the client to wait", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => 0 });
    expect([1, 2, 3].map(() => limiter.check("a").allowed)).toEqual([true, true, true]);
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 20 });
  });

  it("refills continuously instead of resetting at a window edge", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    for (let i = 0; i < 3; i++) limiter.check("a");
    now = 10_000; // half a token so far
    expect(limiter.check("a").allowed).toBe(false);
    now = 20_500; // a 3-per-minute budget earns one token every 20 s
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("keeps a separate budget per client", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("forgets the least recently seen clients when it tracks too many", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxClients: 2, now: () => 0 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c"); // evicts "a", whose bucket starts full again
    expect(limiter.check("a").allowed).toBe(true);
  });
});

describe("clientKeyFromRequest", () => {
  it("uses the first address the proxy recorded", () => {
    const request = new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
    expect(clientKeyFromRequest(request)).toBe("203.0.113.7");
    expect(clientKeyFromRequest(new Request("http://localhost"))).toBe("anonymous");
  });
});
