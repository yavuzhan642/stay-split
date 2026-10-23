import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { IsoDate } from "@/domain/dates";

export { formatMoney } from "@/domain/money";

const fmt = (date: IsoDate, pattern: string) => format(parseISO(date), pattern, { locale: tr });

/** "20 Oca" */
export const formatDay = (date: IsoDate) => fmt(date, "d MMM");

/** "20" */
export const formatDayOfMonth = (date: IsoDate) => fmt(date, "d");

/** "Çar" */
export const formatWeekday = (date: IsoDate) => fmt(date, "EEE");

/** "20 Oca Çar" */
export const formatDayWithWeekday = (date: IsoDate) => fmt(date, "d MMM EEE");

/** "20 Ocak 2027" */
export const formatDateLong = (date: IsoDate) => fmt(date, "d MMMM yyyy");

/** "20–23 Oca 2027", "30 Oca – 2 Şub 2027", "30 Ara 2027 – 2 Oca 2028" */
export function formatDateRange(from: IsoDate, to: IsoDate): string {
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const sameMonth = sameYear && from.slice(5, 7) === to.slice(5, 7);
  if (sameMonth) return `${fmt(from, "d")}–${fmt(to, "d MMM yyyy")}`;
  if (sameYear) return `${fmt(from, "d MMM")} – ${fmt(to, "d MMM yyyy")}`;
  return `${fmt(from, "d MMM yyyy")} – ${fmt(to, "d MMM yyyy")}`;
}

export const formatNights = (nights: number) => `${nights} gece`;

const decimal = (value: number) => value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

/** Turkish puts the percent sign first and uses a decimal comma: "%6,9". */
export const formatPercent = (percent: number) => `%${decimal(percent)}`;

export const formatKm = (km: number) => `${decimal(km)} km`;

export const formatRating = (rating: number) =>
  rating.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatCount = (value: number) => value.toLocaleString("tr-TR");
