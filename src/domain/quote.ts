import type { IsoDate } from "./dates";
import type { Money } from "./money";

/** A check-in/check-out pair. Check-out is exclusive: 20 → 23 Jan is 3 nights (20, 21, 22). */
export interface StayInterval {
  readonly checkIn: IsoDate;
  readonly checkOut: IsoDate;
}

export type PriceLineKind = "room" | "discount" | "fee" | "tax";

export interface PriceLine {
  readonly kind: PriceLineKind;
  readonly label: string;
  readonly amount: Money;
}

/**
 * A provider's bookable offer for one property and one exact stay interval.
 *
 * `total` is the all-in price for the whole interval, as the provider quotes
 * it. It is deliberately NOT derived from nightly rates: length-of-stay
 * discounts, cleaning fees and per-stay charges make the price of 20 → 23
 * differ from (20 → 21) + (21 → 23). The optimizer only ever reads `total`.
 */
export interface StayQuote extends StayInterval {
  readonly id: string;
  readonly providerId: string;
  readonly propertyId: string;
  readonly adults: number;
  readonly total: Money;
  /** Informational breakdown for display; may be empty. Never used for optimization. */
  readonly breakdown: readonly PriceLine[];
  /** Deep link to book with the provider. Null when there is none, which is always the case for demo data. */
  readonly bookingUrl: string | null;
  /** When the provider produced this price (ISO timestamp). Prices go stale and must be re-checked before booking. */
  readonly retrievedAt: string;
}
