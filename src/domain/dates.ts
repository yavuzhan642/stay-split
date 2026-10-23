import {
  addDays as addCalendarDays,
  differenceInCalendarDays,
  format,
  getDay,
  isValid,
  parseISO,
} from "date-fns";

/**
 * A calendar date with no time or time zone, e.g. "2027-01-20".
 *
 * Hotel nights are calendar dates, not instants: "the night of 20 January" is
 * the same night for a guest in Istanbul and a server in Virginia. JS `Date`
 * objects are instants, and converting them across time zones is the classic
 * source of off-by-one-night bugs. So the app passes "YYYY-MM-DD" strings
 * around and only touches `Date` inside these helpers.
 *
 * The brand makes the compiler reject a raw string where a validated date is
 * expected: the only way to get an `IsoDate` is through `toIsoDate`/`isIsoDate`.
 */
export type IsoDate = string & { readonly __brand: "IsoDate" };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  // parseISO reads date-only strings as local midnight; formatting back in the
  // same zone round-trips, and the comparison rejects dates like 2027-02-30.
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value;
}

export function toIsoDate(value: string): IsoDate {
  if (!isIsoDate(value)) {
    throw new RangeError(`Invalid calendar date "${value}", expected YYYY-MM-DD`);
  }
  return value;
}

/** The calendar date of `date` in the runtime's local time zone. */
export function isoDateFromDate(date: Date): IsoDate {
  return format(date, "yyyy-MM-dd") as IsoDate;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return isoDateFromDate(addCalendarDays(parseISO(date), days));
}

/** Nights between check-in and check-out; negative when the order is reversed. */
export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
}

/** The date of each night slept: check-in inclusive, check-out exclusive. */
export function eachNight(checkIn: IsoDate, checkOut: IsoDate): IsoDate[] {
  const nights = Math.max(0, nightsBetween(checkIn, checkOut));
  return Array.from({ length: nights }, (_, i) => addDays(checkIn, i));
}

/**
 * Today's calendar date in a given IANA time zone. "Is this check-in in the
 * past?" depends on where the hotel is: at 01:00 in Istanbul it is already
 * tomorrow compared with a server running on UTC.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return toIsoDate(`${part("year")}-${part("month")}-${part("day")}`);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return getDay(parseISO(date));
}

/** 0 = January … 11 = December. */
export function monthIndex(date: IsoDate): number {
  return Number(date.slice(5, 7)) - 1;
}
