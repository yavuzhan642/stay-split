import { addDays, nightsBetween, type IsoDate } from "@/domain/dates";
import type { CurrencyCode } from "@/domain/money";
import type { Property } from "@/domain/property";
import type { StayQuote } from "@/domain/quote";

export type QuoteRejectionReason =
  | "unknown-property"
  | "invalid-dates"
  | "outside-search-window"
  | "currency-mismatch"
  | "guest-count-mismatch"
  | "invalid-price";

export interface RejectedQuote {
  readonly quote: StayQuote;
  readonly reason: QuoteRejectionReason;
}

export interface QuoteTableInput {
  readonly checkIn: IsoDate;
  readonly checkOut: IsoDate;
  readonly currency: CurrencyCode;
  readonly adults: number;
  readonly properties: readonly Property[];
  readonly quotes: readonly StayQuote[];
}

/**
 * Validated, indexed quotes: the price c(p, i, j) of staying at property p
 * from boundary i to boundary j, answered in O(1).
 *
 * Provider data is never trusted blindly. A quote in the wrong currency, for
 * the wrong guest count, or with a nonsensical price would silently corrupt
 * every total built on it, so such quotes are rejected (and reported) here,
 * before the optimizer sees them. If a provider returns several quotes for the
 * same property and interval (e.g. several room types), the cheapest wins.
 */
export class QuoteTable {
  readonly checkIn: IsoDate;
  readonly nights: number;
  readonly currency: CurrencyCode;
  /** Sorted by id, so property indices (and therefore tie-breaks) are deterministic. */
  readonly properties: readonly Property[];
  readonly rejected: readonly RejectedQuote[];
  readonly acceptedCount: number;

  // Flat array indexed by (p, from, to). NaN marks "no bookable quote".
  private readonly costs: Float64Array;
  private readonly quotes: (StayQuote | undefined)[];

  private constructor(input: QuoteTableInput) {
    this.checkIn = input.checkIn;
    this.nights = nightsBetween(input.checkIn, input.checkOut);
    if (!Number.isInteger(this.nights) || this.nights < 1) {
      throw new RangeError(`Check-out must be after check-in, got ${input.checkIn} → ${input.checkOut}`);
    }
    this.currency = input.currency;

    const byId = new Map<string, Property>();
    for (const property of input.properties) if (!byId.has(property.id)) byId.set(property.id, property);
    this.properties = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const size = this.properties.length * (this.nights + 1) * (this.nights + 1);
    this.costs = new Float64Array(size).fill(Number.NaN);
    this.quotes = new Array<StayQuote | undefined>(size);

    const indexById = new Map(this.properties.map((property, index) => [property.id, index]));
    const rejected: RejectedQuote[] = [];
    let accepted = 0;

    for (const quote of input.quotes) {
      const reason = this.validate(quote, indexById, input);
      if (reason) {
        rejected.push({ quote, reason });
        continue;
      }
      const slot = this.slot(
        indexById.get(quote.propertyId)!,
        nightsBetween(this.checkIn, quote.checkIn),
        nightsBetween(this.checkIn, quote.checkOut),
      );
      const existing = this.costs[slot]!;
      if (Number.isNaN(existing) || quote.total.amount < existing) {
        if (Number.isNaN(existing)) accepted++;
        this.costs[slot] = quote.total.amount;
        this.quotes[slot] = quote;
      }
    }

    this.rejected = rejected;
    this.acceptedCount = accepted;
  }

  static build(input: QuoteTableInput): QuoteTable {
    return new QuoteTable(input);
  }

  /** Price of [from, to) at property index p, in minor units; undefined when not bookable. */
  cost(p: number, from: number, to: number): number | undefined {
    const value = this.costs[this.slot(p, from, to)];
    return value === undefined || Number.isNaN(value) ? undefined : value;
  }

  quote(p: number, from: number, to: number): StayQuote | undefined {
    return this.quotes[this.slot(p, from, to)];
  }

  /** The calendar date of a boundary index: 0 = check-in, N = check-out. */
  dateAt(boundary: number): IsoDate {
    return addDays(this.checkIn, boundary);
  }

  private slot(p: number, from: number, to: number): number {
    const width = this.nights + 1;
    return (p * width + from) * width + to;
  }

  private validate(
    quote: StayQuote,
    indexById: ReadonlyMap<string, number>,
    input: QuoteTableInput,
  ): QuoteRejectionReason | null {
    if (!indexById.has(quote.propertyId)) return "unknown-property";
    const from = nightsBetween(this.checkIn, quote.checkIn);
    const to = nightsBetween(this.checkIn, quote.checkOut);
    if (!Number.isInteger(from) || !Number.isInteger(to) || to <= from) return "invalid-dates";
    if (from < 0 || to > this.nights) return "outside-search-window";
    if (quote.total.currency !== input.currency) return "currency-mismatch";
    if (quote.adults !== input.adults) return "guest-count-mismatch";
    if (!Number.isSafeInteger(quote.total.amount) || quote.total.amount <= 0) return "invalid-price";
    return null;
  }
}
