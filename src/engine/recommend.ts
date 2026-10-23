import type { RecommendationReason } from "@/domain/search";
import type { RankedPlan } from "./optimizer";

/**
 * When is moving worth it? Changing hotels costs the guest time and effort
 * (packing, an 11:00 check-out vs. a 14:00 check-in), so a split must beat
 * the plan with fewer switches by a meaningful margin, not by a few lira.
 */
export interface RecommendationPolicy {
  /** Minimum saving as a share of the price of the plan with fewer switches (0–100). */
  readonly minSavingsPercent: number;
  /** Minimum saving in minor units of the search currency. */
  readonly minSavingsAmount: number;
}

/** Any saving at all is enough; equal prices still go to the plan with fewer switches. */
export const STRICT_PRICE_POLICY: RecommendationPolicy = { minSavingsPercent: 0, minSavingsAmount: 0 };

export interface RecommendationInput {
  /** Index s: the cheapest plan with exactly s switches, ignoring the budget (undefined = none). */
  readonly bestBySwitchCount: readonly (RankedPlan | undefined)[];
  readonly maxSwitches: number;
  readonly policy: RecommendationPolicy;
  /** Plans the guest may actually be offered, e.g. those within budget. */
  readonly isEligible?: (plan: RankedPlan) => boolean;
  /** Cheapest split when transfer costs are ignored; lets us explain when transfers kill the saving. */
  readonly cheapestSplitLodgingOnly?: number | null;
}

export interface RecommendationDecision {
  readonly plan: RankedPlan;
  readonly reason: RecommendationReason;
}

/**
 * Picks the plan to recommend and says why. Business rules live here, apart
 * from the optimizer: the optimizer answers "what is cheapest for each switch
 * count", this decides "what should we tell the guest".
 *
 * Walking from fewer to more switches, a candidate replaces the current pick
 * only when it is strictly cheaper by at least the policy threshold. So equal
 * prices always resolve to fewer switches.
 */
export function recommend(input: RecommendationInput): RecommendationDecision | null {
  const isEligible = input.isEligible ?? (() => true);
  let pick: RankedPlan | undefined;
  for (const candidate of input.bestBySwitchCount) {
    if (!candidate || !isEligible(candidate)) continue;
    if (!pick || isWorthSwitching(pick, candidate, input.policy)) pick = candidate;
  }
  return pick ? { plan: pick, reason: explain(pick, input) } : null;
}

function isWorthSwitching(current: RankedPlan, candidate: RankedPlan, policy: RecommendationPolicy): boolean {
  const savings = current.totalCost - candidate.totalCost;
  if (savings <= 0) return false;
  const percent = (savings / current.totalCost) * 100;
  return savings >= policy.minSavingsAmount && percent >= policy.minSavingsPercent;
}

function explain(pick: RankedPlan, input: RecommendationInput): RecommendationReason {
  const single = input.bestBySwitchCount[0];
  if (pick.switchCount > 0) return single ? "split-saves-money" : "no-single-available";

  if (input.maxSwitches === 0) return "single-only-requested";

  const splits = input.bestBySwitchCount.slice(1).filter((plan): plan is RankedPlan => plan !== undefined);
  if (splits.length === 0) return "no-split-available";

  const cheapestSplit = Math.min(...splits.map((plan) => plan.totalCost));
  if (cheapestSplit === pick.totalCost) return "tie-prefers-fewer-switches";
  if (cheapestSplit < pick.totalCost) return "savings-below-threshold";

  const lodgingOnly = input.cheapestSplitLodgingOnly;
  if (lodgingOnly != null && lodgingOnly < pick.totalCost) return "transfer-cost-cancels-savings";
  return "single-is-cheapest";
}
