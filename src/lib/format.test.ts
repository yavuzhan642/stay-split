import { describe, expect, it } from "vitest";
import { toIsoDate } from "@/domain/dates";
import { formatDateRange, formatDayWithWeekday, formatKm, formatPercent, formatRating } from "./format";

const d = toIsoDate;

describe("format", () => {
  it("shortens date ranges the way people write them", () => {
    expect(formatDateRange(d("2027-01-20"), d("2027-01-23"))).toBe("20–23 Oca 2027");
    expect(formatDateRange(d("2027-01-30"), d("2027-02-02"))).toBe("30 Oca – 2 Şub 2027");
    expect(formatDateRange(d("2027-12-30"), d("2028-01-02"))).toBe("30 Ara 2027 – 2 Oca 2028");
  });

  it("uses Turkish day names", () => {
    expect(formatDayWithWeekday(d("2027-01-20"))).toBe("20 Oca Çar");
  });

  it("writes numbers the Turkish way", () => {
    expect(formatPercent(6.9)).toBe("%6,9");
    expect(formatPercent(40)).toBe("%40");
    expect(formatKm(1.8)).toBe("1,8 km");
    expect(formatRating(8)).toBe("8,0");
  });
});
