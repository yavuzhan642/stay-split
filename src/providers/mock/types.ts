import type { CityId } from "@/domain/cities";
import type { GeoPoint } from "@/domain/geo";
import type { PropertyType } from "@/domain/property";

/**
 * Everything the simulator needs to price one fictional property. Public
 * fields become a `Property`; `rates` and `rules` stay inside the mock, the
 * same way a real provider keeps its revenue-management logic to itself.
 *
 * Amounts here are whole TRY for readability; the pricing step converts to kuruş.
 */
export interface MockPropertySeed {
  readonly id: string;
  readonly name: string;
  readonly type: PropertyType;
  readonly cityId: CityId;
  readonly neighborhood: string;
  readonly location: GeoPoint;
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly maxGuests: number;
  readonly amenities: readonly string[];
  readonly rates: MockRates;
  readonly rules: MockStayRules;
}

export interface MockRates {
  /** Nightly price before season, weekend and demand adjustments. */
  readonly baseNightly: number;
  /** per-room: the price covers `includedGuests`. per-person: dorm beds, price × adults. */
  readonly pricing: "per-room" | "per-person";
  readonly includedGuests: number;
  readonly extraGuestNightly: number;
  /** 0.2 → 20 % more on the city's weekend nights. */
  readonly weekendUplift: number;
  /** Amplitude of day-to-day demand noise: 0.1 → ±10 %. */
  readonly volatility: number;
  /** Charged once per stay, so two short stays pay it twice. */
  readonly cleaningFee: number;
  readonly lengthOfStayDiscounts: readonly { readonly minNights: number; readonly percent: number }[];
}

export interface MockStayRules {
  readonly minNights: number;
  /** Probability that any given night is sold out. */
  readonly soldOutRate: number;
  /** Nights (YYYY-MM-DD) that are always sold out; useful for demos and tests. */
  readonly blockedNights: readonly string[];
}

/** City-wide pricing conventions: when the weekend is, the high season, local taxes. */
export interface CityPricingProfile {
  /** Day of week (0 = Sunday) of nights priced as weekend nights. */
  readonly weekendNights: readonly number[];
  /** Price multiplier per month, January first. */
  readonly seasonality: readonly number[];
  readonly percentTaxes: readonly {
    readonly label: string;
    readonly percent: number;
    readonly appliesTo: readonly PropertyType[];
  }[];
  /** Per person, per night, in whole TRY. */
  readonly perPersonNightTax: {
    readonly label: string;
    readonly amountByType: Readonly<Record<PropertyType, number>>;
  } | null;
}
