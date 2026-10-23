import { money } from "@/domain/money";
import type { Property } from "@/domain/property";
import type { StayQuote } from "@/domain/quote";
import {
  ProviderError,
  type AccommodationProvider,
  type PropertySearchCriteria,
  type ProviderCallOptions,
  type ProviderInfo,
  type QuoteRequest,
} from "../types";
import { CITY_PROFILES, MOCK_PROPERTIES } from "./data";
import { priceStay } from "./pricing";
import type { MockPropertySeed } from "./types";

export interface MockProviderOptions {
  /** Replace the built-in catalogue, e.g. with a hand-made scenario in tests. */
  readonly properties?: readonly MockPropertySeed[];
  /** Artificial delay per call, to exercise loading states in the UI. */
  readonly latencyMs?: number;
  readonly now?: () => Date;
}

/**
 * Simulated provider with fictional properties and deterministic prices.
 * It implements the same contract a real integration will, so everything
 * built on top of it carries over unchanged. Prices are TRY only and booking
 * links are always null: nothing here may look like a real offer.
 */
export class MockAccommodationProvider implements AccommodationProvider {
  readonly info: ProviderInfo = { id: "mock", name: "StaySplit demo verisi (simülasyon)", isDemo: true };

  private readonly seeds: ReadonlyMap<string, MockPropertySeed>;
  private readonly latencyMs: number;
  private readonly now: () => Date;

  constructor(options: MockProviderOptions = {}) {
    this.seeds = new Map((options.properties ?? MOCK_PROPERTIES).map((seed) => [seed.id, seed]));
    this.latencyMs = options.latencyMs ?? 0;
    this.now = options.now ?? (() => new Date());
  }

  async searchProperties(criteria: PropertySearchCriteria, options?: ProviderCallOptions): Promise<Property[]> {
    await delay(this.latencyMs, options?.signal);
    const types = criteria.propertyTypes;
    return [...this.seeds.values()]
      .filter((seed) => seed.cityId === criteria.cityId)
      .filter((seed) => types.length === 0 || types.includes(seed.type))
      .filter((seed) => seed.maxGuests >= criteria.adults)
      .map((seed) => this.toProperty(seed));
  }

  async getQuotes(request: QuoteRequest, options?: ProviderCallOptions): Promise<StayQuote[]> {
    await delay(this.latencyMs, options?.signal);
    if (request.currency !== "TRY") {
      throw new ProviderError(this.info.id, `Demo data is priced in TRY only, got ${request.currency}`);
    }

    const retrievedAt = this.now().toISOString();
    const quotes: StayQuote[] = [];
    for (const propertyId of request.propertyIds) {
      const seed = this.seeds.get(propertyId);
      if (!seed) continue;
      for (const stay of request.stays) {
        const outcome = priceStay(seed, CITY_PROFILES[seed.cityId], stay.checkIn, stay.checkOut, request.adults);
        if (!outcome.bookable) continue;
        quotes.push({
          id: `${this.info.id}:${propertyId}:${stay.checkIn}:${stay.checkOut}:${request.adults}`,
          providerId: this.info.id,
          propertyId,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          adults: request.adults,
          total: money(outcome.total, "TRY"),
          breakdown: outcome.lines.map((line) => ({ ...line, amount: money(line.amount, "TRY") })),
          bookingUrl: null,
          retrievedAt,
        });
      }
    }
    return quotes;
  }

  private toProperty(seed: MockPropertySeed): Property {
    return {
      id: seed.id,
      providerId: this.info.id,
      name: seed.name,
      type: seed.type,
      cityId: seed.cityId,
      neighborhood: seed.neighborhood,
      location: seed.location,
      rating: seed.rating,
      reviewCount: seed.reviewCount,
      maxGuests: seed.maxGuests,
      amenities: seed.amenities,
    };
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
