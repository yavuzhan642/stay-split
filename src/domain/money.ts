/**
 * Money is kept in integer minor units (kuruş, cents). Binary floating point
 * cannot represent most decimal prices exactly (0.1 + 0.2 !== 0.3); integers
 * can, so adding up any number of quotes stays exact.
 */
export const CURRENCY_CODES = ["TRY", "EUR", "USD", "EGP"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface Money {
  /** Integer amount in minor units: 1 TRY = 100 kuruş. All supported currencies have 2 decimals. */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export function money(amount: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Money amount must be an integer number of minor units, got ${amount}`);
  }
  return { amount, currency };
}

/** 1250.5 TRY → 125050 kuruş. Use only at system boundaries (forms, provider payloads). */
export function fromMajorUnits(value: number, currency: CurrencyCode): Money {
  return money(Math.round(value * 100), currency);
}

export function formatMoney(value: Money, locale = "tr-TR"): string {
  const fractionDigits = value.amount % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value.amount / 100);
}
