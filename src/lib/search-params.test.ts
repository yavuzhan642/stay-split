import { describe, expect, it } from "vitest";
import { fromMajorUnits } from "@/domain/money";
import { validateSearchQuery } from "@/services/search-query";
import { makeQuery } from "@/test/builders";
import { queryToSearchParams, searchHref, searchKey, searchParamsToInput, type RawSearchParams } from "./search-params";

const NOW = new Date("2026-10-24T09:00:00Z");

/** What Next.js hands a page for a given query string. */
function parse(search: string): RawSearchParams {
  const params: RawSearchParams = {};
  for (const [key, value] of new URLSearchParams(search)) {
    const existing = params[key];
    params[key] = existing === undefined ? value : [...(Array.isArray(existing) ? existing : [existing]), value];
  }
  return params;
}

describe("search params", () => {
  it("round-trips a query through the URL", () => {
    const query = makeQuery({
      propertyTypes: ["hotel", "apartment"],
      budget: fromMajorUnits(3000.5, "TRY"),
      includeTransferCost: true,
      maxSwitches: 0,
    });
    const url = queryToSearchParams(query).toString();
    expect(validateSearchQuery(searchParamsToInput(parse(url)), { now: NOW })).toEqual({ ok: true, query });
  });

  it("reads what a native GET form submits", () => {
    // Unchecked checkboxes are omitted, empty inputs arrive as "".
    const input = searchParamsToInput(
      parse("city=rome&checkIn=2027-05-12&checkOut=2027-05-17&adults=2&types=hostel&switches=1&budget="),
    );
    const result = validateSearchQuery(input, { now: NOW });
    expect(result.ok && result.query).toMatchObject({
      cityId: "rome",
      propertyTypes: ["hostel"],
      budget: null,
      includeTransferCost: false,
    });
  });

  it("builds links for a modified search", () => {
    const href = searchHref(makeQuery({ budget: fromMajorUnits(2000, "TRY") }), { budget: null, maxSwitches: 1 });
    expect(href).toBe("/search?city=istanbul&checkIn=2027-01-20&checkOut=2027-01-23&adults=2&switches=1");
  });

  it("identifies a search regardless of parameter order", () => {
    expect(searchKey(parse("b=2&a=1"))).toBe(searchKey(parse("a=1&b=2")));
    expect(searchKey(parse("a=1"))).not.toBe(searchKey(parse("a=2")));
  });
});
