import { dayOfWeek, eachNight, monthIndex, type IsoDate } from "@/domain/dates";
import type { PriceLineKind } from "@/domain/quote";
import { unitHash } from "./prng";
import type { CityPricingProfile, MockPropertySeed } from "./types";

export interface PriceLineDraft {
  readonly kind: PriceLineKind;
  readonly label: string;
  /** Minor units (kuruş). */
  readonly amount: number;
}

export type UnbookableReason = "empty-stay" | "capacity" | "min-stay" | "sold-out";

export type PricingOutcome =
  | { readonly bookable: true; readonly total: number; readonly lines: readonly PriceLineDraft[] }
  | { readonly bookable: false; readonly reason: UnbookableReason };

export function isSoldOut(seed: MockPropertySeed, night: IsoDate): boolean {
  return (
    seed.rules.blockedNights.includes(night) ||
    unitHash(`${seed.id}|${night}|availability`) < seed.rules.soldOutRate
  );
}

/** Room price for one night in whole TRY, before guest-count adjustments. */
export function baseNightlyRate(seed: MockPropertySeed, profile: CityPricingProfile, night: IsoDate): number {
  const { rates } = seed;
  const season = profile.seasonality[monthIndex(night)] ?? 1;
  const weekend = profile.weekendNights.includes(dayOfWeek(night)) ? 1 + rates.weekendUplift : 1;
  const demand = 1 + rates.volatility * (2 * unitHash(`${seed.id}|${night}|demand`) - 1);
  return Math.round(rates.baseNightly * season * weekend * demand);
}

/**
 * Prices one stay the way a hotel's booking engine would: the total for the
 * interval as a whole, not a sum of independent nights. Length-of-stay
 * discounts, the per-stay cleaning fee and percentage taxes all make
 * price(20 → 23) ≠ price(20 → 21) + price(21 → 23). That non-additivity is
 * exactly why the optimizer works with interval quotes.
 */
export function priceStay(
  seed: MockPropertySeed,
  profile: CityPricingProfile,
  checkIn: IsoDate,
  checkOut: IsoDate,
  adults: number,
): PricingOutcome {
  const nights = eachNight(checkIn, checkOut);
  if (nights.length === 0) return { bookable: false, reason: "empty-stay" };
  if (adults > seed.maxGuests) return { bookable: false, reason: "capacity" };
  if (nights.length < seed.rules.minNights) return { bookable: false, reason: "min-stay" };
  if (nights.some((night) => isSoldOut(seed, night))) return { bookable: false, reason: "sold-out" };

  const { rates } = seed;
  const extraGuests = Math.max(0, adults - rates.includedGuests);
  const roomTotal = nights.reduce((sum, night) => {
    const base = baseNightlyRate(seed, profile, night);
    const nightly = rates.pricing === "per-person" ? base * adults : base + extraGuests * rates.extraGuestNightly;
    return sum + nightly * 100;
  }, 0);

  const lines: PriceLineDraft[] = [{ kind: "room", label: `${nights.length} gece konaklama`, amount: roomTotal }];

  const discountPercent = Math.max(
    0,
    ...rates.lengthOfStayDiscounts.filter((d) => nights.length >= d.minNights).map((d) => d.percent),
  );
  if (discountPercent > 0) {
    lines.push({
      kind: "discount",
      label: `Uzun konaklama indirimi (%${discountPercent})`,
      amount: -Math.round((roomTotal * discountPercent) / 100),
    });
  }

  if (rates.cleaningFee > 0) {
    lines.push({ kind: "fee", label: "Temizlik ücreti", amount: rates.cleaningFee * 100 });
  }

  const taxableBase = sumLines(lines);
  for (const tax of profile.percentTaxes) {
    if (!tax.appliesTo.includes(seed.type)) continue;
    lines.push({
      kind: "tax",
      label: `${tax.label} (%${tax.percent})`,
      amount: Math.round((taxableBase * tax.percent) / 100),
    });
  }

  const nightTax = profile.perPersonNightTax;
  if (nightTax) {
    lines.push({
      kind: "tax",
      label: nightTax.label,
      amount: nightTax.amountByType[seed.type] * 100 * adults * nights.length,
    });
  }

  return { bookable: true, total: sumLines(lines), lines };
}

function sumLines(lines: readonly PriceLineDraft[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}
