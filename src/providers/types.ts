import type { CurrencyCode } from "@/domain/money";
import type { Property, PropertyType } from "@/domain/property";
import type { StayInterval, StayQuote } from "@/domain/quote";

/**
 * The boundary between StaySplit and any source of accommodation data.
 *
 * The engine and the search service only know this interface. Swapping the
 * mock for a real integration (Booking.com Demand API, an affiliate network,
 * a channel manager) means writing one new class that implements it; nothing
 * upstream changes.
 *
 * The shape mirrors how real availability APIs work: first find candidate
 * properties, then ask for prices for exact check-in/check-out pairs.
 */
export interface AccommodationProvider {
  readonly info: ProviderInfo;

  /** Properties in the city that match the filters and can host `adults` guests. */
  searchProperties(criteria: PropertySearchCriteria, options?: ProviderCallOptions): Promise<Property[]>;

  /**
   * Prices for every (property, stay) pair that is actually bookable.
   *
   * Unavailable combinations (sold-out night, minimum-stay rule, capacity) are
   * simply absent from the result: an absent quote means "cannot book this".
   * Each quote's `total` must be the provider's price for that exact interval.
   */
  getQuotes(request: QuoteRequest, options?: ProviderCallOptions): Promise<StayQuote[]>;
}

export interface ProviderInfo {
  readonly id: string;
  readonly name: string;
  /** True for simulated data; surfaced in every search result. */
  readonly isDemo: boolean;
}

export interface PropertySearchCriteria {
  readonly cityId: string;
  readonly adults: number;
  /** Empty means every type. */
  readonly propertyTypes: readonly PropertyType[];
}

export interface QuoteRequest {
  readonly propertyIds: readonly string[];
  readonly stays: readonly StayInterval[];
  readonly adults: number;
  readonly currency: CurrencyCode;
}

export interface ProviderCallOptions {
  /** Lets callers cancel slow upstream requests (user navigated away, timeout). */
  readonly signal?: AbortSignal;
}

/** Raised for provider failures, so callers can tell them apart from bugs in our own code. */
export class ProviderError extends Error {
  readonly providerId: string;
  /** Whether trying again later might succeed (timeouts, rate limits) as opposed to a bad request. */
  readonly retryable: boolean;

  constructor(providerId: string, message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "ProviderError";
    this.providerId = providerId;
    this.retryable = options.retryable ?? false;
  }
}
