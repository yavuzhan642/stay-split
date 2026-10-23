import { findCity } from "@/domain/cities";
import { isIsoDate, nightsBetween, todayInTimeZone, type IsoDate } from "@/domain/dates";
import { fromMajorUnits } from "@/domain/money";
import { PROPERTY_TYPES, type PropertyType } from "@/domain/property";
import type { SearchQuery } from "@/domain/search";

/**
 * Product limits. maxSwitches is capped at 1 for the MVP: the engine handles
 * any K, but more switches need more provider requests (O(N²) intervals
 * instead of O(N)) and a UI that explains three-hotel trips.
 */
export const SEARCH_LIMITS = {
  maxNights: 30,
  maxAdults: 8,
  maxSwitches: 1,
  maxDaysAhead: 365,
} as const;

/** Raw, untrusted input: URL search params, a form, a JSON body. */
export interface SearchQueryInput {
  readonly cityId?: unknown;
  readonly checkIn?: unknown;
  readonly checkOut?: unknown;
  readonly adults?: unknown;
  readonly propertyTypes?: unknown;
  readonly maxSwitches?: unknown;
  /** Whole-trip budget in major units (e.g. TRY, not kuruş). */
  readonly budget?: unknown;
  readonly includeTransferCost?: unknown;
}

export interface ValidationIssue {
  readonly field: keyof SearchQueryInput;
  /** Shown to the user as is. */
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly query: SearchQuery }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

/**
 * Validates untrusted input into a `SearchQuery`. Everything past this point
 * can rely on the types: dates are real calendar dates in the right order,
 * counts are integers within limits. Collects all issues instead of stopping
 * at the first, so a form can highlight every wrong field at once.
 */
export function validateSearchQuery(input: SearchQueryInput, options: { now?: Date } = {}): ValidationResult {
  const issues: ValidationIssue[] = [];
  const fail = (field: ValidationIssue["field"], message: string) => {
    issues.push({ field, message });
  };

  const city = typeof input.cityId === "string" ? findCity(input.cityId) : undefined;
  if (!city) fail("cityId", "Lütfen listeden bir şehir seçin.");

  const checkIn = parseDate(input.checkIn);
  const checkOut = parseDate(input.checkOut);
  if (!checkIn) fail("checkIn", "Geçerli bir giriş tarihi seçin.");
  if (!checkOut) fail("checkOut", "Geçerli bir çıkış tarihi seçin.");

  if (checkIn && checkOut) {
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) fail("checkOut", "Çıkış tarihi giriş tarihinden sonra olmalı.");
    else if (nights > SEARCH_LIMITS.maxNights) fail("checkOut", `En fazla ${SEARCH_LIMITS.maxNights} gecelik arama yapılabilir.`);

    if (city) {
      const today = todayInTimeZone(city.timeZone, options.now);
      const daysAhead = nightsBetween(today, checkIn);
      if (daysAhead < 0) fail("checkIn", "Giriş tarihi geçmişte olamaz.");
      else if (daysAhead > SEARCH_LIMITS.maxDaysAhead) fail("checkIn", "En fazla bir yıl sonrası için arama yapılabilir.");
    }
  }

  const adults = parseInteger(input.adults);
  if (adults === null || adults < 1 || adults > SEARCH_LIMITS.maxAdults) {
    fail("adults", `Yetişkin sayısı 1 ile ${SEARCH_LIMITS.maxAdults} arasında olmalı.`);
  }

  const propertyTypes = parsePropertyTypes(input.propertyTypes);
  if (!propertyTypes) fail("propertyTypes", "Geçersiz konaklama türü.");

  const maxSwitches = input.maxSwitches === undefined ? SEARCH_LIMITS.maxSwitches : parseInteger(input.maxSwitches);
  if (maxSwitches === null || maxSwitches < 0 || maxSwitches > SEARCH_LIMITS.maxSwitches) {
    fail("maxSwitches", `Otel değişikliği 0 ile ${SEARCH_LIMITS.maxSwitches} arasında olmalı.`);
  }

  const budget = parseBudget(input.budget);
  if (budget === undefined) fail("budget", "Bütçe pozitif bir sayı olmalı.");

  const includeTransferCost = parseBoolean(input.includeTransferCost ?? false);
  if (includeTransferCost === null) fail("includeTransferCost", "Geçersiz transfer seçeneği.");

  // The explicit checks narrow every value's type for the compiler.
  if (
    issues.length > 0 ||
    !city ||
    !checkIn ||
    !checkOut ||
    adults === null ||
    !propertyTypes ||
    maxSwitches === null ||
    budget === undefined ||
    includeTransferCost === null
  ) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    query: {
      cityId: city.id,
      checkIn,
      checkOut,
      adults,
      propertyTypes,
      maxSwitches,
      // MVP prices in TRY only; multi-currency needs FX rates and a currency picker.
      budget: budget === null ? null : fromMajorUnits(budget, "TRY"),
      includeTransferCost,
      currency: "TRY",
    },
  };
}

function parseDate(value: unknown): IsoDate | null {
  return typeof value === "string" && isIsoDate(value) ? value : null;
}

/** Accepts numbers and numeric strings (URL params are always strings). */
function parseInteger(value: unknown): number | null {
  const number = typeof value === "string" && /^-?\d+$/.test(value.trim()) ? Number(value) : value;
  return typeof number === "number" && Number.isSafeInteger(number) ? number : null;
}

/** null = no budget; undefined = invalid. */
function parseBudget(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

/** Accepts an array or a comma-separated string; empty means all types. */
function parsePropertyTypes(value: unknown): PropertyType[] | null {
  if (value === undefined || value === null || value === "") return [];
  const items = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(items)) return null;
  const types = new Set<PropertyType>();
  for (const item of items) {
    const type = typeof item === "string" ? item.trim() : item;
    if (!PROPERTY_TYPES.includes(type as PropertyType)) return null;
    types.add(type as PropertyType);
  }
  return [...types];
}
