import { describe, expect, it } from "vitest";
import { money } from "@/domain/money";
import { validateSearchQuery, type SearchQueryInput } from "./search-query";

const NOW = new Date("2026-10-24T09:00:00Z");
const VALID: SearchQueryInput = { cityId: "istanbul", checkIn: "2027-01-20", checkOut: "2027-01-23", adults: 2 };

function issuesFor(input: SearchQueryInput, now = NOW) {
  const result = validateSearchQuery(input, { now });
  return result.ok ? [] : result.issues.map((issue) => issue.field);
}

describe("validateSearchQuery", () => {
  it("parses string input, as it arrives from URL search params", () => {
    const result = validateSearchQuery(
      {
        cityId: "rome",
        checkIn: "2027-01-20",
        checkOut: "2027-01-23",
        adults: "2",
        propertyTypes: "hotel,apartment",
        maxSwitches: "0",
        budget: "3000.50",
        includeTransferCost: "true",
      },
      { now: NOW },
    );
    expect(result).toEqual({
      ok: true,
      query: {
        cityId: "rome",
        checkIn: "2027-01-20",
        checkOut: "2027-01-23",
        adults: 2,
        propertyTypes: ["hotel", "apartment"],
        maxSwitches: 0,
        budget: money(300_050, "TRY"),
        includeTransferCost: true,
        currency: "TRY",
      },
    });
  });

  it("fills in defaults for optional fields", () => {
    const result = validateSearchQuery(VALID, { now: NOW });
    expect(result.ok && result.query).toMatchObject({
      propertyTypes: [],
      maxSwitches: 1,
      budget: null,
      includeTransferCost: false,
    });
    expect(issuesFor({ ...VALID, budget: "" })).toEqual([]);
  });

  it("rejects dates that are malformed, impossible or in the wrong order", () => {
    expect(issuesFor({ ...VALID, checkIn: "20.01.2027" })).toEqual(["checkIn"]);
    expect(issuesFor({ ...VALID, checkIn: "2027-02-30" })).toEqual(["checkIn"]);
    expect(issuesFor({ ...VALID, checkOut: "2027-01-20" })).toEqual(["checkOut"]);
    expect(issuesFor({ ...VALID, checkOut: "2027-01-18" })).toEqual(["checkOut"]);
  });

  it("enforces the product limits on trip length and booking window", () => {
    expect(issuesFor({ ...VALID, checkOut: "2027-02-19" })).toEqual([]); // 30 nights
    expect(issuesFor({ ...VALID, checkOut: "2027-02-20" })).toEqual(["checkOut"]); // 31 nights
    expect(issuesFor({ ...VALID, checkIn: "2026-10-23", checkOut: "2026-10-25" })).toEqual(["checkIn"]);
    expect(issuesFor({ ...VALID, checkIn: "2027-10-25", checkOut: "2027-10-27" })).toEqual(["checkIn"]);
  });

  it("decides what 'today' is in the destination's time zone", () => {
    // 22:30 UTC on the 19th is already the 20th in Istanbul, still the 19th in Rome.
    const lateEvening = new Date("2027-01-19T22:30:00Z");
    const stay = { checkIn: "2027-01-19", checkOut: "2027-01-21", adults: 2 };
    expect(issuesFor({ ...stay, cityId: "istanbul" }, lateEvening)).toEqual(["checkIn"]);
    expect(issuesFor({ ...stay, cityId: "rome" }, lateEvening)).toEqual([]);
  });

  it("rejects unknown cities, bad guest counts and unsupported options", () => {
    expect(issuesFor({ ...VALID, cityId: "paris" })).toEqual(["cityId"]);
    for (const adults of [0, 9, 2.5, "two", undefined]) expect(issuesFor({ ...VALID, adults })).toEqual(["adults"]);
    expect(issuesFor({ ...VALID, maxSwitches: 2 })).toEqual(["maxSwitches"]);
    expect(issuesFor({ ...VALID, propertyTypes: ["hotel", "villa"] })).toEqual(["propertyTypes"]);
    expect(issuesFor({ ...VALID, budget: -5 })).toEqual(["budget"]);
    expect(issuesFor({ ...VALID, budget: "cheap" })).toEqual(["budget"]);
    expect(issuesFor({ ...VALID, includeTransferCost: "yes" })).toEqual(["includeTransferCost"]);
  });

  it("reports every problem at once, with a message for the user", () => {
    const result = validateSearchQuery({ cityId: "paris", checkIn: "x", adults: 0 }, { now: NOW });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.field)).toEqual(["cityId", "checkIn", "checkOut", "adults"]);
    expect(result.issues.every((issue) => issue.message.length > 0)).toBe(true);
  });
});
