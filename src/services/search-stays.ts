import { addDays, nightsBetween } from "@/domain/dates";
import { money } from "@/domain/money";
import type { Recommendation, SearchQuery, SearchResult, StayPlan } from "@/domain/search";
import {
  comparePlans,
  DEFAULT_MAX_PLANS,
  optimizeStay,
  type OptimizationResult,
  type RankedPlan,
} from "@/engine/optimizer";
import { findPlanViolations } from "@/engine/plan-invariants";
import { QuoteTable } from "@/engine/quote-table";
import { requiredRanges } from "@/engine/ranges";
import { recommend, type RecommendationPolicy } from "@/engine/recommend";
import { toStayPlan } from "@/engine/stay-plan";
import { distanceBasedTransferCost, noTransferCost, type TransferCostModel } from "@/engine/transfer-cost";
import { ProviderError, type AccommodationProvider } from "@/providers/types";

/** A split must save at least 5 % to be recommended over staying put; see `RecommendationPolicy`. */
export const DEFAULT_RECOMMENDATION_POLICY: RecommendationPolicy = { minSavingsPercent: 5, minSavingsAmount: 0 };

/** Rough taxi estimate in kuruş: 150 TL + 40 TL/km, at least 250 TL. TRY-only, like the MVP. */
export const DEFAULT_TRANSFER_COST_MODEL: TransferCostModel = distanceBasedTransferCost({
  baseFee: 150_00,
  perKm: 40_00,
  minimumFee: 250_00,
});

export interface SearchDependencies {
  readonly provider: AccommodationProvider;
  readonly transferCostModel?: TransferCostModel;
  readonly policy?: RecommendationPolicy;
  readonly maxPlans?: number;
  readonly minNightsPerSegment?: number;
  readonly signal?: AbortSignal;
}

/**
 * The search use case: provider → validated quote table → optimizer →
 * recommendation → presentable plans. Dependencies are passed in rather than
 * imported, so tests (and later, real providers) plug in without mocks of
 * module internals.
 */
export async function searchStays(query: SearchQuery, deps: SearchDependencies): Promise<SearchResult> {
  const startedAt = performance.now();
  const { provider, signal } = deps;
  const policy = deps.policy ?? DEFAULT_RECOMMENDATION_POLICY;
  const minNightsPerSegment = deps.minNightsPerSegment ?? 1;
  const maxPlans = deps.maxPlans ?? DEFAULT_MAX_PLANS;
  const nights = nightsBetween(query.checkIn, query.checkOut);
  if (nights < 1) throw new RangeError("SearchQuery must cover at least one night; validate it first");

  // 1. Candidate properties.
  const properties = await callProvider(provider, signal, () =>
    provider.searchProperties(
      { cityId: query.cityId, adults: query.adults, propertyTypes: query.propertyTypes },
      { signal },
    ),
  );

  // 2. Prices for exactly the intervals a valid plan could use.
  const ranges = properties.length > 0 ? requiredRanges(nights, query.maxSwitches, minNightsPerSegment) : [];
  const quotes =
    ranges.length > 0
      ? await callProvider(provider, signal, () =>
          provider.getQuotes(
            {
              propertyIds: properties.map((property) => property.id),
              stays: ranges.map((range) => ({
                checkIn: addDays(query.checkIn, range.from),
                checkOut: addDays(query.checkIn, range.to),
              })),
              adults: query.adults,
              currency: query.currency,
            },
            { signal },
          ),
        )
      : [];

  // 3. Optimize.
  const table = QuoteTable.build({
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    currency: query.currency,
    adults: query.adults,
    properties,
    quotes,
  });
  const transferCost = query.includeTransferCost ? (deps.transferCostModel ?? DEFAULT_TRANSFER_COST_MODEL) : noTransferCost;
  const optimizerOptions = { maxSwitches: query.maxSwitches, minNightsPerSegment, maxPlans };
  const optimization = optimizeStay(table, { ...optimizerOptions, transferCost });

  const bestBySwitchCount = optimization.plansBySwitchCount.map((plans) => plans[0]);
  const bestSingle = bestBySwitchCount[0];
  const bestSplit = bestSplitOf(optimization);

  // A lodging-only pass is needed only to tell the guest "splitting would save X, but transfers eat it".
  const cheapestSplitLodgingOnly =
    query.includeTransferCost && query.maxSwitches > 0
      ? (bestSplitOf(optimizeStay(table, { ...optimizerOptions, maxPlans: 1 }))?.totalCost ?? null)
      : null;

  // 4. Recommend.
  const budget = query.budget?.amount ?? null;
  const withinBudget = (plan: RankedPlan) => budget === null || plan.totalCost <= budget;
  const decision = recommend({
    bestBySwitchCount,
    maxSwitches: query.maxSwitches,
    policy,
    isEligible: withinBudget,
    cheapestSplitLodgingOnly,
  });

  // 5. Present.
  const context = { table, bestSingleCost: bestSingle?.totalCost ?? null, budget };
  const presented = new Map<RankedPlan, StayPlan>();
  const present = (plan: RankedPlan): StayPlan => {
    let stayPlan = presented.get(plan);
    if (!stayPlan) {
      stayPlan = toStayPlan(plan, context);
      assertValid(stayPlan, query);
      presented.set(plan, stayPlan);
    }
    return stayPlan;
  };

  const recommended = decision ? present(decision.plan) : null;
  const recommendation: Recommendation | null =
    decision && recommended
      ? {
          planId: recommended.id,
          kind: decision.plan.switchCount === 0 ? "single" : "split",
          reason: decision.reason,
          savings: decision.plan.switchCount > 0 ? recommended.savingsVsBestSingle : null,
          savingsBeforeTransfer:
            decision.reason === "transfer-cost-cancels-savings" && bestSingle && cheapestSplitLodgingOnly !== null
              ? money(bestSingle.totalCost - cheapestSplitLodgingOnly, query.currency)
              : null,
        }
      : null;

  return {
    query,
    recommendation,
    emptyReason:
      properties.length === 0
        ? "no-matching-properties"
        : optimization.plans.length === 0
          ? "no-availability"
          : decision === null
            ? "over-budget"
            : null,
    recommended,
    bestSingle: bestSingle ? present(bestSingle) : null,
    bestSplit: bestSplit ? present(bestSplit) : null,
    alternatives: optimization.plans.filter(withinBudget).map(present),
    stats: {
      propertiesConsidered: properties.length,
      stayIntervalsRequested: ranges.length,
      quotesReceived: quotes.length,
      quotesRejected: table.rejected.length,
      validCombinations: optimization.validPlanCount,
      durationMs: Math.round(performance.now() - startedAt),
    },
    dataSource: { providerId: provider.info.id, providerName: provider.info.name, isDemo: provider.info.isDemo },
    warnings: rejectionWarnings(table),
  };
}

/** The cheapest plan with at least one switch. */
function bestSplitOf(result: OptimizationResult): RankedPlan | undefined {
  return result.plansBySwitchCount
    .slice(1)
    .map((plans) => plans[0])
    .filter((plan): plan is RankedPlan => plan !== undefined)
    .sort(comparePlans)[0];
}

/** Lets aborts through untouched and wraps anything unexpected as a ProviderError. */
async function callProvider<T>(
  provider: AccommodationProvider,
  signal: AbortSignal | undefined,
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ProviderError || signal?.aborted) throw error;
    throw new ProviderError(provider.info.id, `Provider "${provider.info.id}" request failed`, {
      cause: error,
      retryable: true,
    });
  }
}

function assertValid(plan: StayPlan, query: SearchQuery): void {
  const violations = findPlanViolations(plan, query);
  if (violations.length > 0) {
    throw new Error(`Engine produced an invalid plan ${plan.id}: ${violations.join("; ")}`);
  }
}

function rejectionWarnings(table: QuoteTable): string[] {
  if (table.rejected.length === 0) return [];
  const byReason = new Map<string, number>();
  for (const { reason } of table.rejected) byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  const detail = [...byReason].map(([reason, n]) => `${reason}: ${n}`).join(", ");
  return [`Ignored ${table.rejected.length} invalid quote(s) (${detail})`];
}
