import { describe, expect, it } from "vitest";
import type { RankedPlan } from "./optimizer";
import { recommend, STRICT_PRICE_POLICY, type RecommendationInput } from "./recommend";

/** A stand-in plan: only cost and switch count matter to the recommendation rules. */
function plan(totalTry: number, switchCount: number, lodgingTry = totalTry): RankedPlan {
  return {
    segments: [],
    switchCount,
    lodgingCost: lodgingTry * 100,
    transferCost: (totalTry - lodgingTry) * 100,
    totalCost: totalTry * 100,
  };
}

const FIVE_PERCENT = { minSavingsPercent: 5, minSavingsAmount: 0 };

function decide(input: Partial<RecommendationInput> & Pick<RecommendationInput, "bestBySwitchCount">) {
  return recommend({ maxSwitches: 1, policy: STRICT_PRICE_POLICY, ...input });
}

describe("recommend", () => {
  it("recommends the split when it saves money", () => {
    const split = plan(2700, 1);
    expect(decide({ bestBySwitchCount: [plan(4500, 0), split] })).toEqual({ plan: split, reason: "split-saves-money" });
  });

  it("keeps the single stay when it is cheaper", () => {
    const single = plan(3000, 0);
    expect(decide({ bestBySwitchCount: [single, plan(3200, 1)] })).toEqual({
      plan: single,
      reason: "single-is-cheapest",
    });
  });

  it("prefers fewer switches when the price is the same", () => {
    const single = plan(3000, 0);
    expect(decide({ bestBySwitchCount: [single, plan(3000, 1)] })).toEqual({
      plan: single,
      reason: "tie-prefers-fewer-switches",
    });
  });

  it("does not recommend moving for a saving below the threshold", () => {
    const single = plan(3000, 0);
    const split = plan(2900, 1); // 3.3 % cheaper
    expect(decide({ bestBySwitchCount: [single, split], policy: FIVE_PERCENT })).toEqual({
      plan: single,
      reason: "savings-below-threshold",
    });
    expect(decide({ bestBySwitchCount: [single, split], policy: { minSavingsPercent: 0, minSavingsAmount: 200_00 } }))
      .toEqual({ plan: single, reason: "savings-below-threshold" });
    expect(decide({ bestBySwitchCount: [single, split] })?.plan).toBe(split);
  });

  it("says so when transfer costs are what makes splitting not worth it", () => {
    const single = plan(3000, 0);
    expect(
      decide({ bestBySwitchCount: [single, plan(3300, 1, 2800)], cheapestSplitLodgingOnly: 2800_00 }),
    ).toEqual({ plan: single, reason: "transfer-cost-cancels-savings" });
  });

  it("splits when no single property covers every night", () => {
    const split = plan(5000, 1);
    expect(decide({ bestBySwitchCount: [undefined, split] })).toEqual({ plan: split, reason: "no-single-available" });
  });

  it("explains why there is no split", () => {
    const single = plan(3000, 0);
    expect(decide({ bestBySwitchCount: [single, undefined] })?.reason).toBe("no-split-available");
    expect(decide({ bestBySwitchCount: [single], maxSwitches: 0 })?.reason).toBe("single-only-requested");
  });

  it("only recommends eligible plans, e.g. within budget", () => {
    const split = plan(2700, 1);
    const withinBudget = (p: RankedPlan) => p.totalCost <= 3000_00;
    expect(decide({ bestBySwitchCount: [plan(4500, 0), split], isEligible: withinBudget, policy: FIVE_PERCENT }))
      .toEqual({ plan: split, reason: "split-saves-money" });
    expect(decide({ bestBySwitchCount: [plan(4500, 0), plan(3500, 1)], isEligible: withinBudget })).toBeNull();
  });

  it("walks from fewer to more switches, applying the threshold at each step", () => {
    const oneSwitch = plan(900, 1);
    // 2 switches saves only 1.1 % over 1 switch, so it is not worth the extra move.
    expect(
      decide({ bestBySwitchCount: [plan(1000, 0), oneSwitch, plan(890, 2)], maxSwitches: 2, policy: FIVE_PERCENT })
        ?.plan,
    ).toBe(oneSwitch);
  });

  it("returns null when there is nothing to recommend", () => {
    expect(decide({ bestBySwitchCount: [undefined, undefined] })).toBeNull();
  });
});
