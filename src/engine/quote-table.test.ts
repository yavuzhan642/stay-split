import { describe, expect, it } from "vitest";
import { toIsoDate } from "@/domain/dates";
import { money } from "@/domain/money";
import { makeProperty, makeQuote } from "@/test/builders";
import { QuoteTable } from "./quote-table";

const window = { checkIn: toIsoDate("2027-01-20"), checkOut: toIsoDate("2027-01-23"), currency: "TRY", adults: 2 } as const;
const properties = [makeProperty("B"), makeProperty("A")];

describe("QuoteTable", () => {
  it("indexes quotes by property and boundary, with properties sorted by id", () => {
    const table = QuoteTable.build({ ...window, properties, quotes: [makeQuote("B", "2027-01-21", "2027-01-23", 1800)] });
    expect(table.nights).toBe(3);
    expect(table.properties.map((p) => p.id)).toEqual(["A", "B"]);
    expect(table.cost(1, 1, 3)).toBe(180_000);
    expect(table.cost(0, 1, 3)).toBeUndefined();
    expect(table.dateAt(1)).toBe("2027-01-21");
  });

  it("keeps the cheapest of several quotes for the same stay", () => {
    const table = QuoteTable.build({
      ...window,
      properties,
      quotes: [
        makeQuote("A", "2027-01-20", "2027-01-23", 3000, { id: "standard" }),
        makeQuote("A", "2027-01-20", "2027-01-23", 2800, { id: "promo" }),
        makeQuote("A", "2027-01-20", "2027-01-23", 3100, { id: "suite" }),
      ],
    });
    expect(table.cost(0, 0, 3)).toBe(280_000);
    expect(table.quote(0, 0, 3)?.id).toBe("promo");
    expect(table.acceptedCount).toBe(1);
  });

  it("rejects quotes that would corrupt totals, and says why", () => {
    const table = QuoteTable.build({
      ...window,
      properties,
      quotes: [
        makeQuote("Z", "2027-01-20", "2027-01-23", 1000),
        makeQuote("A", "2027-01-19", "2027-01-21", 1000),
        makeQuote("A", "2027-01-22", "2027-01-22", 1000),
        makeQuote("A", "2027-01-20", "2027-01-23", 1000, { total: money(100_000, "EUR") }),
        makeQuote("A", "2027-01-20", "2027-01-23", 1000, { adults: 1 }),
        makeQuote("A", "2027-01-20", "2027-01-23", 0),
        makeQuote("A", "2027-01-20", "2027-01-23", 1000, { total: { amount: 99.5, currency: "TRY" } }),
      ],
    });
    expect(table.rejected.map((r) => r.reason)).toEqual([
      "unknown-property",
      "outside-search-window",
      "invalid-dates",
      "currency-mismatch",
      "guest-count-mismatch",
      "invalid-price",
      "invalid-price",
    ]);
    expect(table.acceptedCount).toBe(0);
  });

  it("refuses an empty or reversed search window", () => {
    expect(() => QuoteTable.build({ ...window, checkOut: window.checkIn, properties, quotes: [] })).toThrow(RangeError);
  });
});
