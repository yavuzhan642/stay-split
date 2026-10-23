import { describe, expect, it } from "vitest";
import { CITIES } from "@/domain/cities";
import { addDays, nightsBetween, toIsoDate } from "@/domain/dates";
import { fromMajorUnits, money } from "@/domain/money";
import type { SearchResult, StayPlan } from "@/domain/search";
import { findPlanViolations } from "@/engine/plan-invariants";
import { STRICT_PRICE_POLICY } from "@/engine/recommend";
import { flatTransferCost } from "@/engine/transfer-cost";
import { apartment, hotel } from "@/providers/mock/data/seed-helpers";
import { MockAccommodationProvider } from "@/providers/mock/mock-provider";
import { ProviderError, type AccommodationProvider } from "@/providers/types";
import { InMemoryProvider, makeProperty, makeQuery, makeQuote } from "@/test/builders";
import { searchStays, type SearchDependencies } from "./search-stays";

const PROPERTIES = ["A", "B", "C", "D"].map((id) => makeProperty(id));
const TRY = (major: number) => fromMajorUnits(major, "TRY");

/** Quotes as [property, check-in day of January 2027, check-out day, price in TRY]. */
function providerWith(...specs: [string, number, number, number][]): InMemoryProvider {
  const jan = (day: number) => `2027-01-${day}`;
  return new InMemoryProvider(
    PROPERTIES,
    specs.map(([id, from, to, price]) => makeQuote(id, jan(from), jan(to), price)),
  );
}

function search(provider: AccommodationProvider, overrides: Parameters<typeof makeQuery>[0] = {}, deps: Partial<SearchDependencies> = {}) {
  return searchStays(makeQuery(overrides), { provider, ...deps });
}

/** "B 20→21 + C 21→23" */
function describePlan(plan: StayPlan | null): string {
  if (!plan) return "none";
  return plan.segments
    .map((s) => `${s.property.id} ${s.checkIn.slice(8)}→${s.checkOut.slice(8)}`)
    .join(" + ");
}

function expectNoGapsOrOverlaps(result: SearchResult): void {
  const plans = [result.recommended, result.bestSingle, result.bestSplit, ...result.alternatives].filter(
    (plan): plan is StayPlan => plan !== null,
  );
  for (const plan of plans) {
    expect(findPlanViolations(plan, result.query), plan.id).toEqual([]);
    expect(plan.segments[0]!.checkIn).toBe(result.query.checkIn);
    expect(plan.segments.at(-1)!.checkOut).toBe(result.query.checkOut);
    plan.segments.slice(1).forEach((segment, i) => expect(segment.checkIn).toBe(plan.segments[i]!.checkOut));
    const nights = plan.segments.reduce((sum, s) => sum + s.nights, 0);
    expect(nights).toBe(nightsBetween(result.query.checkIn, result.query.checkOut));
  }
}

describe("searchStays: required scenarios", () => {
  it("recommends the single property when it is cheaper", async () => {
    const result = await search(providerWith(["A", 20, 23, 3000], ["B", 20, 21, 1200], ["C", 21, 23, 2000]));

    expect(result.recommendation).toMatchObject({ kind: "single", reason: "single-is-cheapest", savings: null });
    expect(describePlan(result.recommended)).toBe("A 20→23");
    expect(result.bestSplit?.savingsVsBestSingle).toEqual({ amount: TRY(-200), percent: -6.7 });
  });

  it("recommends splitting when two properties are cheaper (the example from the brief)", async () => {
    const result = await search(providerWith(["A", 20, 23, 4500], ["B", 20, 21, 900], ["C", 21, 23, 1800]));

    expect(describePlan(result.recommended)).toBe("B 20→21 + C 21→23");
    expect(result.recommendation).toMatchObject({
      kind: "split",
      reason: "split-saves-money",
      savings: { amount: TRY(1800), percent: 40 },
    });
    expect(result.recommended).toMatchObject({ totalCost: TRY(2700), switchCount: 1 });
    expect(describePlan(result.bestSingle)).toBe("A 20→23");
  });

  it("considers every split date, e.g. 20–22 + 22–23 as well as 20–21 + 21–23", async () => {
    const result = await search(
      providerWith(
        ["A", 20, 23, 4500],
        ["B", 20, 21, 900],
        ["C", 21, 23, 1800],
        ["B", 20, 22, 1500],
        ["C", 22, 23, 900],
      ),
    );
    expect(result.alternatives.map(describePlan)).toEqual(["B 20→22 + C 22→23", "B 20→21 + C 21→23", "A 20→23"]);
    expect(result.recommendation?.savings).toEqual({ amount: TRY(2100), percent: 46.7 });
  });

  it("works around nights on which a property is sold out", async () => {
    // A is sold out on the night of the 22nd, B only has the 22nd. No one can host the whole stay.
    const result = await search(
      providerWith(["A", 20, 21, 1000], ["A", 20, 22, 1900], ["A", 21, 22, 1000], ["B", 22, 23, 1200]),
    );

    expect(describePlan(result.recommended)).toBe("A 20→22 + B 22→23");
    expect(result.recommendation).toMatchObject({ reason: "no-single-available", savings: null });
    expect(result.bestSingle).toBeNull();
    expect(result.stats.validCombinations).toBe(1);
  });

  it("explains when no combination covers every night", async () => {
    // Nobody has the night of the 21st.
    const result = await search(providerWith(["A", 20, 21, 1000], ["B", 22, 23, 1000], ["C", 20, 21, 900]));

    expect(result.emptyReason).toBe("no-availability");
    expect(result.recommendation).toBeNull();
    expect(result.recommended).toBeNull();
    expect(result.alternatives).toEqual([]);
  });

  it("respects a minimum number of nights per stay", async () => {
    const provider = new InMemoryProvider(PROPERTIES, [
      makeQuote("A", "2027-01-20", "2027-01-24", 4000),
      makeQuote("B", "2027-01-20", "2027-01-21", 500), // cheap, but a single night
      makeQuote("C", "2027-01-21", "2027-01-24", 2000),
      makeQuote("B", "2027-01-20", "2027-01-22", 1500),
      makeQuote("C", "2027-01-22", "2027-01-24", 1800),
    ]);
    const result = await search(provider, { checkOut: toIsoDate("2027-01-24") }, { minNightsPerSegment: 2 });

    expect(describePlan(result.recommended)).toBe("B 20→22 + C 22→24");
    expect(result.alternatives.flatMap((plan) => plan.segments).every((s) => s.nights >= 2)).toBe(true);
    // The service did not even ask the provider for 1-night stays.
    const requested = provider.quoteRequests.flatMap((request) => request.stays);
    expect(requested.every((stay) => nightsBetween(stay.checkIn, stay.checkOut) >= 2)).toBe(true);
  });

  it("respects a property's own minimum-stay rule", async () => {
    // The loft is the cheapest per night but requires 3 nights.
    const provider = new MockAccommodationProvider({
      properties: [
        apartment({
          ...SCENARIO_BASE,
          id: "loft",
          name: "Loft",
          rates: { baseNightly: 1000, cleaningFee: 0 },
          rules: { minNights: 3, soldOutRate: 0 },
        }),
        hotel({ ...SCENARIO_BASE, id: "hotel", name: "Hotel", rates: { baseNightly: 4000 }, rules: { soldOutRate: 0 } }),
      ],
    });
    const result = await search(provider, { checkOut: toIsoDate("2027-01-24") }, { policy: STRICT_PRICE_POLICY });

    const loftSegments = result.alternatives.flatMap((plan) => plan.segments).filter((s) => s.property.id === "loft");
    expect(loftSegments.length).toBeGreaterThan(0);
    expect(loftSegments.every((s) => s.nights >= 3)).toBe(true);
    expect(describePlan(result.recommended)).toBe("loft 20→24");
  });

  it("drops the split when the transfer cost cancels the saving", async () => {
    const provider = providerWith(["A", 20, 23, 3000], ["B", 20, 21, 1000], ["C", 21, 23, 1800]);
    const withoutTransfer = await search(provider);
    expect(describePlan(withoutTransfer.recommended)).toBe("B 20→21 + C 21→23");

    const result = await search(provider, { includeTransferCost: true }, { transferCostModel: flatTransferCost(500_00) });
    expect(describePlan(result.recommended)).toBe("A 20→23");
    expect(result.recommendation).toMatchObject({
      reason: "transfer-cost-cancels-savings",
      savingsBeforeTransfer: TRY(200),
    });
    expect(result.bestSplit).toMatchObject({ lodgingCost: TRY(2800), transferCost: TRY(500), totalCost: TRY(3300) });
    expect(result.bestSplit?.transfers).toEqual([
      expect.objectContaining({ fromPropertyId: "B", toPropertyId: "C", date: "2027-01-21", estimatedCost: TRY(500) }),
    ]);
  });

  it("never produces gaps or overlaps between stays", async () => {
    // Only overlapping or only gapped pieces: nothing valid can be built.
    const overlapping = await search(providerWith(["B", 20, 22, 900], ["C", 21, 23, 900]));
    const gapped = await search(providerWith(["D", 20, 21, 900], ["A", 22, 23, 900]));
    expect(overlapping.emptyReason).toBe("no-availability");
    expect(gapped.emptyReason).toBe("no-availability");

    // And across realistic demo searches, every plan returned is contiguous and complete.
    const provider = new MockAccommodationProvider();
    for (const city of CITIES) {
      for (const [checkIn, nights] of [["2027-01-20", 3], ["2027-04-29", 5], ["2027-07-15", 7], ["2027-12-27", 10]] as const) {
        for (const includeTransferCost of [false, true]) {
          const result = await search(provider, {
            cityId: city.id,
            checkIn: toIsoDate(checkIn),
            checkOut: addDays(toIsoDate(checkIn), nights),
            includeTransferCost,
          });
          expectNoGapsOrOverlaps(result);
        }
      }
    }
  });
});

describe("searchStays: recommendation rules", () => {
  it("prefers fewer switches when prices tie", async () => {
    const result = await search(providerWith(["A", 20, 23, 3000], ["B", 20, 21, 1000], ["C", 21, 23, 2000]));
    expect(describePlan(result.recommended)).toBe("A 20→23");
    expect(result.recommendation?.reason).toBe("tie-prefers-fewer-switches");
  });

  it("does not recommend moving for a small saving", async () => {
    const provider = providerWith(["A", 20, 23, 3000], ["B", 20, 21, 1000], ["C", 21, 23, 1900]); // 3.3 % cheaper
    const result = await search(provider);
    expect(result.recommendation?.reason).toBe("savings-below-threshold");
    expect(result.bestSplit?.savingsVsBestSingle?.percent).toBe(3.3);

    const strict = await search(provider, {}, { policy: STRICT_PRICE_POLICY });
    expect(describePlan(strict.recommended)).toBe("B 20→21 + C 21→23");
  });

  it("only asks for the full stay, and never splits, when switching is off", async () => {
    const provider = providerWith(["A", 20, 23, 4500], ["B", 20, 21, 900], ["C", 21, 23, 1800]);
    const result = await search(provider, { maxSwitches: 0 });

    expect(describePlan(result.recommended)).toBe("A 20→23");
    expect(result.recommendation?.reason).toBe("single-only-requested");
    expect(result.bestSplit).toBeNull();
    expect(provider.quoteRequests[0]?.stays).toEqual([{ checkIn: "2027-01-20", checkOut: "2027-01-23" }]);
  });

  it("applies the budget to what it recommends, but still shows the reference price", async () => {
    const provider = providerWith(["A", 20, 23, 4500], ["B", 20, 21, 900], ["C", 21, 23, 1800]);

    const fits = await search(provider, { budget: TRY(3000) });
    expect(describePlan(fits.recommended)).toBe("B 20→21 + C 21→23");
    expect(fits.bestSingle).toMatchObject({ withinBudget: false, totalCost: TRY(4500) });
    expect(fits.alternatives.map(describePlan)).toEqual(["B 20→21 + C 21→23"]);

    const tooLow = await search(provider, { budget: TRY(2000) });
    expect(tooLow.emptyReason).toBe("over-budget");
    expect(tooLow.recommended).toBeNull();
  });

  it("reports when nothing matches the filters", async () => {
    const result = await search(providerWith(["A", 20, 23, 3000]), { propertyTypes: ["hostel"] });
    expect(result.emptyReason).toBe("no-matching-properties");
  });
});

describe("searchStays: robustness", () => {
  it("ignores malformed quotes and reports them", async () => {
    const provider = new InMemoryProvider(PROPERTIES, [
      makeQuote("A", "2027-01-20", "2027-01-23", 3000),
      makeQuote("B", "2027-01-20", "2027-01-23", 10, { total: money(1000, "EUR") }),
    ]);
    const result = await search(provider);
    expect(describePlan(result.recommended)).toBe("A 20→23");
    expect(result.stats.quotesRejected).toBe(1);
    expect(result.warnings).toEqual(["Ignored 1 invalid quote(s) (currency-mismatch: 1)"]);
  });

  it("wraps unexpected provider failures in a ProviderError", async () => {
    const broken: AccommodationProvider = {
      info: { id: "broken", name: "Broken", isDemo: false },
      searchProperties: async () => PROPERTIES,
      getQuotes: async () => {
        throw new TypeError("socket hang up");
      },
    };
    await expect(search(broken)).rejects.toBeInstanceOf(ProviderError);
  });

  it("returns identical plans for identical searches and labels demo data", async () => {
    const provider = new MockAccommodationProvider();
    const query = { cityId: "rome", checkIn: toIsoDate("2027-05-12"), checkOut: toIsoDate("2027-05-17") };
    const [first, second] = await Promise.all([search(provider, query), search(provider, query)]);

    expect(first.alternatives.map((p) => p.id)).toEqual(second.alternatives.map((p) => p.id));
    expect(first.dataSource).toEqual({ providerId: "mock", providerName: expect.any(String), isDemo: true });
    expect(first.alternatives.flatMap((p) => p.segments).every((s) => s.quote.bookingUrl === null)).toBe(true);
  });
});

const SCENARIO_BASE = {
  cityId: "istanbul",
  neighborhood: "Test",
  location: { lat: 41.03, lng: 28.98 },
  rating: 8,
  reviewCount: 10,
} as const;
