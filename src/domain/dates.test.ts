import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, eachNight, isIsoDate, nightsBetween, todayInTimeZone, toIsoDate } from "./dates";

const d = toIsoDate;

describe("dates", () => {
  it("runs the suite in a time zone with daylight saving time", () => {
    // Guards the vitest config: the DST tests below are only meaningful there.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
  });

  it("accepts only real calendar dates in YYYY-MM-DD form", () => {
    expect(isIsoDate("2027-01-20")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2027-02-30")).toBe(false);
    expect(isIsoDate("2027-1-20")).toBe(false);
    expect(isIsoDate("20.01.2027")).toBe(false);
    expect(() => toIsoDate("2027-13-01")).toThrow(RangeError);
  });

  it("treats check-out as exclusive", () => {
    expect(nightsBetween(d("2027-01-20"), d("2027-01-23"))).toBe(3);
    expect(eachNight(d("2027-01-20"), d("2027-01-23"))).toEqual(["2027-01-20", "2027-01-21", "2027-01-22"]);
    expect(eachNight(d("2027-01-23"), d("2027-01-20"))).toEqual([]);
  });

  it("is not thrown off by daylight saving transitions", () => {
    // In New York, clocks jump forward on 2027-03-14 and back on 2027-11-07:
    // those days are 23 and 25 hours long, which breaks naive "ms / 86_400_000" math.
    expect(nightsBetween(d("2027-03-13"), d("2027-03-16"))).toBe(3);
    expect(addDays(d("2027-03-13"), 1)).toBe("2027-03-14");
    expect(addDays(d("2027-03-14"), 1)).toBe("2027-03-15");
    expect(eachNight(d("2027-11-06"), d("2027-11-09"))).toEqual(["2027-11-06", "2027-11-07", "2027-11-08"]);
  });

  it("crosses month and year boundaries", () => {
    expect(addDays(d("2027-12-30"), 3)).toBe("2028-01-02");
    expect(addDays(d("2028-02-28"), 1)).toBe("2028-02-29");
  });

  it("knows the weekday of a night", () => {
    expect(dayOfWeek(d("2027-01-22"))).toBe(5); // Friday
  });

  it("computes today in the destination's time zone", () => {
    const now = new Date("2027-01-19T22:30:00Z");
    expect(todayInTimeZone("Europe/Istanbul", now)).toBe("2027-01-20");
    expect(todayInTimeZone("Europe/Rome", now)).toBe("2027-01-19");
  });
});
