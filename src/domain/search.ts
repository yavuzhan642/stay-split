import type { IsoDate } from "./dates";
import type { CurrencyCode, Money } from "./money";
import type { Property, PropertyType } from "./property";
import type { StayQuote } from "./quote";

/** A validated search. Build it with `validateSearchQuery`, never by hand from user input. */
export interface SearchQuery {
  readonly cityId: string;
  readonly checkIn: IsoDate;
  readonly checkOut: IsoDate;
  readonly adults: number;
  /** Empty means every type. */
  readonly propertyTypes: readonly PropertyType[];
  /** How many times the guest is willing to change property. 0 = single property only. */
  readonly maxSwitches: number;
  /** Upper limit for the whole trip, transfers included. Null = no limit. */
  readonly budget: Money | null;
  readonly includeTransferCost: boolean;
  readonly currency: CurrencyCode;
}

/** One continuous stay at one property, covered by exactly one quote. */
export interface StaySegment {
  readonly property: Property;
  readonly quote: StayQuote;
  readonly checkIn: IsoDate;
  readonly checkOut: IsoDate;
  readonly nights: number;
}

/** Moving between two properties on the switch date (check-out of one, check-in of the next). */
export interface TransferLeg {
  readonly fromPropertyId: string;
  readonly toPropertyId: string;
  readonly date: IsoDate;
  readonly distanceKm: number;
  readonly estimatedCost: Money;
}

export interface Savings {
  /** Positive = cheaper than the best single-property stay, negative = more expensive. */
  readonly amount: Money;
  /** Share of the best single-property price, rounded to one decimal. */
  readonly percent: number;
}

/** A complete answer to the search: consecutive segments that cover every night exactly once. */
export interface StayPlan {
  /** Deterministic, so the same plan has the same id across searches. */
  readonly id: string;
  readonly segments: readonly StaySegment[];
  readonly transfers: readonly TransferLeg[];
  readonly switchCount: number;
  readonly lodgingCost: Money;
  readonly transferCost: Money;
  readonly totalCost: Money;
  /** Null when no single property can host the whole trip, so there is nothing to compare against. */
  readonly savingsVsBestSingle: Savings | null;
  readonly withinBudget: boolean;
}

export type RecommendationReason =
  /** Splitting is cheaper by more than the policy threshold. */
  | "split-saves-money"
  /** No single property is available for every night; splitting is the only way. */
  | "no-single-available"
  /** The guest asked for a single property. */
  | "single-only-requested"
  /** No valid split exists (availability, minimum stays, …). */
  | "no-split-available"
  /** The best split costs exactly the same; fewer moves wins. */
  | "tie-prefers-fewer-switches"
  /** A split is cheaper, but not by enough to be worth moving. */
  | "savings-below-threshold"
  /** A split is cheaper on lodging alone, but the transfer cost wipes out the saving. */
  | "transfer-cost-cancels-savings"
  /** Every split is more expensive even before transfers. */
  | "single-is-cheapest";

export interface Recommendation {
  readonly planId: string;
  readonly kind: "single" | "split";
  readonly reason: RecommendationReason;
  /** Savings of the recommended split vs. the best single stay. Null when the recommendation is that single stay or none exists. */
  readonly savings: Savings | null;
  /** For "transfer-cost-cancels-savings": what splitting would have saved before transfer costs. */
  readonly savingsBeforeTransfer: Money | null;
}

export type EmptyReason =
  /** No property in the city matches the type and guest filters. */
  | "no-matching-properties"
  /** Properties exist, but no combination covers every night. */
  | "no-availability"
  /** Valid plans exist, but all of them exceed the budget. */
  | "over-budget";

export interface SearchStats {
  readonly propertiesConsidered: number;
  readonly stayIntervalsRequested: number;
  readonly quotesReceived: number;
  readonly quotesRejected: number;
  /** Every distinct valid plan the engine evaluated (not only the ones returned). */
  readonly validCombinations: number;
  readonly durationMs: number;
}

export interface DataSource {
  readonly providerId: string;
  readonly providerName: string;
  /** True for simulated data. The UI must say so next to every price. */
  readonly isDemo: boolean;
}

export interface SearchResult {
  readonly query: SearchQuery;
  /** Null when there is nothing to offer; see `emptyReason`. */
  readonly recommendation: Recommendation | null;
  readonly emptyReason: EmptyReason | null;
  readonly recommended: StayPlan | null;
  /** Shown even when over budget, as the reference price for savings. */
  readonly bestSingle: StayPlan | null;
  readonly bestSplit: StayPlan | null;
  /** Cheapest plans within budget, ascending by total cost; ties go to fewer switches. */
  readonly alternatives: readonly StayPlan[];
  readonly stats: SearchStats;
  readonly dataSource: DataSource;
  /** Non-fatal issues, e.g. malformed quotes that were ignored. Meant for logs, not end users. */
  readonly warnings: readonly string[];
}
