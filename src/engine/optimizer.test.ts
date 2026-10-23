import { describe, expect, it } from "vitest";
import { addDays, toIsoDate } from "@/domain/dates";
import type { StayQuote } from "@/domain/quote";
import { makeProperty, makeQuote } from "@/test/builders";
import { optimizeStay, type OptimizeOptions, type PlanSegment, type RankedPlan } from "./optimizer";
import { QuoteTable } from "./quote-table";
import { flatTransferCost, type TransferCostModel } from "./transfer-cost";

const CHECK_IN = toIsoDate("2027-01-20");

/** Quotes are written as [property, check-in day of January, check-out day, price in TRY]. */
type QuoteSpec = readonly [string, number, number, number];

function tableFor(specs: readonly QuoteSpec[], nights = 3): QuoteTable {
  const ids = [...new Set(specs.map(([id]) => id))];
  const jan = (day: number) => `2027-01-${String(day).padStart(2, "0")}`;
  return QuoteTable.build({
    checkIn: CHECK_IN,
    checkOut: addDays(CHECK_IN, nights),
    currency: "TRY",
    adults: 2,
    properties: ids.map((id) => makeProperty(id)),
    quotes: specs.map(([id, from, to, price]) => makeQuote(id, jan(from), jan(to), price)),
  });
}

/** "B 20→21 + C 21→23", readable in assertion failures. */
function describePlan(plan: RankedPlan | undefined, table: QuoteTable): string {
  if (!plan) return "none";
  return plan.segments
    .map((s) => `${table.properties[s.propertyIndex]!.id} ${20 + s.from}→${20 + s.to}`)
    .join(" + ");
}

function run(specs: readonly QuoteSpec[], options: Partial<OptimizeOptions> = {}, nights = 3) {
  const table = tableFor(specs, nights);
  const result = optimizeStay(table, { maxSwitches: 1, ...options });
  return { table, result, best: describePlan(result.plans[0], table) };
}

describe("optimizeStay", () => {
  it("finds the cheaper split from the product brief", () => {
    const { result, best } = run([
      ["A", 20, 23, 4500],
      ["B", 20, 21, 900],
      ["C", 21, 23, 1800],
    ]);
    expect(best).toBe("B 20→21 + C 21→23");
    expect(result.plans[0]!.totalCost).toBe(270_000);
    expect(result.plansBySwitchCount[0]![0]!.totalCost).toBe(450_000);
  });

  it("evaluates every split date, not just the first one", () => {
    const { result, table } = run([
      ["A", 20, 23, 4500],
      ["B", 20, 21, 900],
      ["C", 21, 23, 1800],
      ["B", 20, 22, 1500],
      ["C", 22, 23, 900],
    ]);
    expect(result.plans.map((plan) => describePlan(plan, table))).toEqual([
      "B 20→22 + C 22→23",
      "B 20→21 + C 21→23",
      "A 20→23",
    ]);
  });

  it("only combines segments that meet exactly: no gaps, no overlaps", () => {
    const overlap = run([
      ["B", 20, 22, 900], // both cover the night of the 21st
      ["C", 21, 23, 900],
    ]);
    const gap = run([
      ["B", 20, 21, 900], // nobody covers the night of the 21st
      ["C", 22, 23, 900],
    ]);
    for (const { result } of [overlap, gap]) {
      expect(result.plans).toEqual([]);
      expect(result.validPlanCount).toBe(0);
    }
  });

  it("does not split a stay into two bookings at the same property", () => {
    const { best } = run([
      ["A", 20, 23, 3000],
      ["A", 20, 21, 500],
      ["A", 21, 23, 1000],
    ]);
    expect(best).toBe("A 20→23");
  });

  it("never splits when maxSwitches is 0", () => {
    const { result, best } = run(
      [
        ["A", 20, 23, 4500],
        ["B", 20, 21, 900],
        ["C", 21, 23, 1800],
      ],
      { maxSwitches: 0 },
    );
    expect(best).toBe("A 20→23");
    expect(result.plans.every((plan) => plan.switchCount === 0)).toBe(true);
  });

  it("handles more than one switch when allowed", () => {
    const specs: QuoteSpec[] = [
      ["A", 20, 21, 500],
      ["B", 21, 22, 500],
      ["C", 22, 23, 500],
      ["A", 20, 23, 3000],
      ["B", 21, 23, 1500],
    ];
    expect(run(specs, { maxSwitches: 1 }).best).toBe("A 20→21 + B 21→23");
    expect(run(specs, { maxSwitches: 2 }).best).toBe("A 20→21 + B 21→22 + C 22→23");
  });

  it("respects a minimum segment length", () => {
    const specs: QuoteSpec[] = [
      ["A", 20, 24, 4000],
      ["B", 20, 21, 500],
      ["C", 21, 24, 2000],
      ["B", 20, 22, 1500],
      ["C", 22, 24, 1800],
    ];
    expect(run(specs, {}, 4).best).toBe("B 20→21 + C 21→24");
    const { result, best } = run(specs, { minNightsPerSegment: 2 }, 4);
    expect(best).toBe("B 20→22 + C 22→24");
    expect(result.plans.flatMap((plan) => plan.segments).every((s) => s.to - s.from >= 2)).toBe(true);
  });

  it("adds the transfer cost of every move to the total", () => {
    const { result } = run(
      [
        ["B", 20, 21, 900],
        ["C", 21, 23, 1800],
      ],
      { transferCost: flatTransferCost(300_00) },
    );
    const plan = result.plans[0]!;
    expect(plan.lodgingCost).toBe(270_000);
    expect(plan.transferCost).toBe(30_000);
    expect(plan.totalCost).toBe(300_000);
    expect(plan.segments.map((s) => s.transferCostIn)).toEqual([0, 30_000]);
  });

  it("lets transfer costs change which plan wins", () => {
    const specs: QuoteSpec[] = [
      ["A", 20, 23, 3000],
      ["B", 20, 21, 1000],
      ["C", 21, 23, 1800],
    ];
    expect(run(specs).best).toBe("B 20→21 + C 21→23");
    expect(run(specs, { transferCost: flatTransferCost(500_00) }).best).toBe("A 20→23");
  });

  it("breaks price ties in favour of fewer switches", () => {
    const { result, table } = run([
      ["B", 20, 21, 1000],
      ["C", 21, 23, 2000],
      ["A", 20, 23, 3000],
    ]);
    expect(result.plans.map((plan) => describePlan(plan, table))).toEqual(["A 20→23", "B 20→21 + C 21→23"]);
  });

  it("returns at most maxPlans plans", () => {
    const specs: QuoteSpec[] = ["A", "B", "C", "D"].flatMap((id, i): QuoteSpec[] => [
      [id, 20, 23, 3000 + i],
      [id, 20, 21, 1000 + i],
      [id, 21, 23, 2000 + i],
    ]);
    const { result } = run(specs, { maxPlans: 3 });
    expect(result.plans).toHaveLength(3);
    expect(result.validPlanCount).toBe(4 + 4 * 3);
  });

  it("rejects nonsensical options", () => {
    const table = tableFor([
      ["A", 20, 23, 3000],
      ["B", 20, 23, 3000],
    ]);
    expect(() => optimizeStay(table, { maxSwitches: -1 })).toThrow(RangeError);
    expect(() => optimizeStay(table, { maxSwitches: 1, minNightsPerSegment: 0 })).toThrow(RangeError);
    expect(() => optimizeStay(table, { maxSwitches: 1, maxPlans: 0 })).toThrow(RangeError);
    expect(() => optimizeStay(table, { maxSwitches: 1, transferCost: () => -1 })).toThrow(RangeError);
  });
});

/**
 * Differential testing: on hundreds of random small instances, the DP must
 * return exactly what exhaustive enumeration of every valid plan returns.
 * Prices are drawn from a tiny range on purpose, so ties are frequent and
 * the tie-breaking rules get exercised too.
 */
describe("optimizeStay vs. brute force", () => {
  it("agrees on rankings and plan counts for random instances", () => {
    const random = mulberry32(20270120);
    const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

    for (let instance = 0; instance < 400; instance++) {
      const nights = int(1, 6);
      const propertyCount = int(1, 4);
      const maxSwitches = int(0, 3);
      const minNightsPerSegment = int(1, 2);
      const maxPlans = int(1, 6);
      const ids = Array.from({ length: propertyCount }, (_, i) => `P${i}`);

      const quotes: StayQuote[] = [];
      for (const id of ids) {
        for (let from = 0; from < nights; from++) {
          for (let to = from + 1; to <= nights; to++) {
            if (random() < 0.6) {
              quotes.push(makeQuote(id, addDays(CHECK_IN, from), addDays(CHECK_IN, to), int(1, 12) * 100));
            }
          }
        }
      }
      const transferById = new Map(ids.flatMap((a) => ids.map((b) => [`${a}>${b}`, int(0, 3) * 100_00] as const)));
      const transferCost: TransferCostModel = (from, to) => transferById.get(`${from.id}>${to.id}`)!;

      const table = QuoteTable.build({
        checkIn: CHECK_IN,
        checkOut: addDays(CHECK_IN, nights),
        currency: "TRY",
        adults: 2,
        properties: ids.map((id) => makeProperty(id)),
        quotes,
      });
      const options = { maxSwitches, minNightsPerSegment, maxPlans, transferCost };
      const result = optimizeStay(table, options);
      const all = enumerateAllPlans(table, options).sort(referenceOrder);

      const context = JSON.stringify({ instance, nights, propertyCount, maxSwitches, minNightsPerSegment, maxPlans });
      expect(result.validPlanCount, context).toBe(all.length);
      expect(result.plans, context).toEqual(all.slice(0, maxPlans));
      for (let s = 0; s <= maxSwitches; s++) {
        expect(result.plansBySwitchCount[s], context).toEqual(
          all.filter((plan) => plan.switchCount === s).slice(0, maxPlans),
        );
      }
    }
  });
});

/** The obvious exponential algorithm: try every sequence of segments. Only usable for tiny inputs. */
function enumerateAllPlans(
  table: QuoteTable,
  options: { maxSwitches: number; minNightsPerSegment: number; transferCost: TransferCostModel },
): RankedPlan[] {
  const plans: RankedPlan[] = [];
  const { properties, nights } = table;

  const extend = (from: number, segments: PlanSegment[]) => {
    if (from === nights) {
      const lodgingCost = segments.reduce((sum, s) => sum + s.lodgingCost, 0);
      const transferCost = segments.reduce((sum, s) => sum + s.transferCostIn, 0);
      plans.push({
        segments,
        switchCount: segments.length - 1,
        lodgingCost,
        transferCost,
        totalCost: lodgingCost + transferCost,
      });
      return;
    }
    if (segments.length > options.maxSwitches) return;
    for (let to = from + options.minNightsPerSegment; to <= nights; to++) {
      for (let p = 0; p < properties.length; p++) {
        const previous = segments.at(-1);
        if (previous?.propertyIndex === p) continue;
        const lodgingCost = table.cost(p, from, to);
        if (lodgingCost === undefined) continue;
        const transferCostIn = previous
          ? options.transferCost(properties[previous.propertyIndex]!, properties[p]!)
          : 0;
        extend(to, [...segments, { propertyIndex: p, from, to, lodgingCost, transferCostIn }]);
      }
    }
  };

  extend(0, []);
  return plans;
}

/** Written independently of the optimizer's comparator, from the spec: cost, switches, then dates and property. */
function referenceOrder(a: RankedPlan, b: RankedPlan): number {
  const key = (plan: RankedPlan) => [
    plan.totalCost,
    plan.switchCount,
    ...plan.segments.flatMap((s) => [s.to, s.propertyIndex]),
  ];
  const ka = key(a);
  const kb = key(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const diff = (ka[i] ?? 0) - (kb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
