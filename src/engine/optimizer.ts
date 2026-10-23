import type { QuoteTable } from "./quote-table";
import { noTransferCost, type TransferCostModel } from "./transfer-cost";

export const DEFAULT_MAX_PLANS = 10;

export interface OptimizeOptions {
  /** K: the most property changes a plan may have. 0 = single property only. */
  readonly maxSwitches: number;
  /**
   * Shortest segment the engine may propose. This is a guest preference;
   * properties' own minimum-stay rules are enforced by the provider, which
   * simply returns no quote for a too-short stay.
   */
  readonly minNightsPerSegment?: number;
  /** k: how many of the cheapest plans to keep, per switch count and overall. */
  readonly maxPlans?: number;
  readonly transferCost?: TransferCostModel;
}

export interface PlanSegment {
  readonly propertyIndex: number;
  /** Check-in boundary (0 = trip check-in). */
  readonly from: number;
  /** Check-out boundary (N = trip check-out). */
  readonly to: number;
  readonly lodgingCost: number;
  /** Transfer cost paid to arrive at this segment; 0 for the first one. */
  readonly transferCostIn: number;
}

export interface RankedPlan {
  readonly segments: readonly PlanSegment[];
  readonly switchCount: number;
  readonly lodgingCost: number;
  readonly transferCost: number;
  readonly totalCost: number;
}

export interface OptimizationResult {
  /** The k best plans overall, in rank order. */
  readonly plans: readonly RankedPlan[];
  /** Index s: the k best plans with exactly s switches. */
  readonly plansBySwitchCount: readonly (readonly RankedPlan[])[];
  /** How many distinct valid plans exist in total, not only the k returned. */
  readonly validPlanCount: number;
}

/**
 * Finds the cheapest ways to cover every night with at most K property changes.
 *
 * ## Model
 * Boundaries 0 … N are the dates of the trip (0 = check-in, N = check-out).
 * A plan is a sequence of segments
 *
 *     [b₀ = 0, b₁) at p₁,  [b₁, b₂) at p₂,  …,  [b_s, b_{s+1} = N) at p_{s+1}
 *
 * with b strictly increasing (so no gaps, no overlaps, every night covered)
 * and p_t ≠ p_{t+1} (a "switch" to the same property is not a switch). Its cost is
 *
 *     Σ c(p_t, b_{t-1}, b_t)  +  Σ τ(p_t, p_{t+1})
 *
 * where c is the provider's quote for that exact interval (not a sum of
 * nightly rates) and τ is the transfer cost between properties.
 *
 * ## Shortest path on a DAG
 * Think of states (j, p, s): "nights [0, j) are covered, the last segment is at
 * p, and s switches were used". Every state only depends on states with a
 * smaller j, so the states form a directed acyclic graph ordered by date and a
 * plan is a path through it. The cheapest plan is a shortest path, found by
 * dynamic programming in date order:
 *
 *     D(j, p, 0) = c(p, 0, j)
 *     D(j, p, s) = min over i < j, q ≠ p of  D(i, q, s − 1) + τ(q, p) + c(p, i, j)
 *
 * Optimal substructure holds because the cost of what comes after state
 * (i, q, s) does not depend on how we got there.
 *
 * ## k best instead of only the best
 * The UI also shows alternatives, so each state keeps its k cheapest partial
 * plans instead of one number. This stays exact: if a complete plan is among
 * the k best overall, its prefix must be among the k best at its state.
 * Otherwise k cheaper prefixes would exist there, each extendable by the same
 * suffix, giving k plans that beat it. Ties are broken by a fixed total order
 * (cost, then switch count, then segment dates and property), which keeps the
 * argument valid and the output deterministic.
 *
 * ## Complexity
 * O(K · N² · P² · k) time for N nights, P properties, k plans. For a 14-night
 * trip, 50 properties, K = 1 and k = 10 that is about 5 million cheap steps.
 * Exhaustive enumeration is the same for K = 1 but grows as P^(K+1), which is
 * why the DP form matters once K ≥ 2.
 */
export function optimizeStay(table: QuoteTable, options: OptimizeOptions): OptimizationResult {
  const N = table.nights;
  const P = table.properties.length;
  const K = options.maxSwitches;
  const m = options.minNightsPerSegment ?? 1;
  const k = options.maxPlans ?? DEFAULT_MAX_PLANS;
  assertInteger(K, 0, "maxSwitches");
  assertInteger(m, 1, "minNightsPerSegment");
  assertInteger(k, 1, "maxPlans");

  const transfer = buildTransferMatrix(table, options.transferCost ?? noTransferCost);

  // best[s][j][p]: the k cheapest partial plans covering [0, j) with exactly s
  // switches, ending at property p. count[s][j][p]: how many exist in total.
  const best: RankedPlan[][][][] = [];
  const count: number[][][] = [];

  for (let s = 0; s <= K; s++) {
    const bestS = Array.from({ length: N + 1 }, () => Array.from({ length: P }, (): RankedPlan[] => []));
    const countS = Array.from({ length: N + 1 }, () => new Array<number>(P).fill(0));

    // s switches mean s + 1 segments of at least m nights, so j ≥ m(s + 1).
    for (let j = m * (s + 1); j <= N; j++) {
      // The last layer is never extended, so only complete stays matter there.
      if (s === K && j < N) continue;

      for (let p = 0; p < P; p++) {
        const list = bestS[j]![p]!;

        if (s === 0) {
          const c = table.cost(p, 0, j);
          if (c === undefined) continue;
          list.push(appendSegment(null, { propertyIndex: p, from: 0, to: j, lodgingCost: c, transferCostIn: 0 }));
          countS[j]![p] = 1;
          continue;
        }

        let combinations = 0;
        // i is the switch date: check-out of the previous segment, check-in of this one.
        for (let i = m * s; i <= j - m; i++) {
          const c = table.cost(p, i, j);
          if (c === undefined) continue;
          const prefixesAtI = best[s - 1]![i]!;
          const countsAtI = count[s - 1]![i]!;

          for (let q = 0; q < P; q++) {
            if (q === p) continue;
            combinations += countsAtI[q]!;
            const t = transfer[q * P + p]!;
            for (const prefix of prefixesAtI[q]!) {
              const total = prefix.totalCost + t + c;
              // Prefixes are sorted by cost, so once one is too expensive, all later ones are too.
              if (list.length === k && total > list[k - 1]!.totalCost) break;
              insertBounded(
                list,
                appendSegment(prefix, { propertyIndex: p, from: i, to: j, lodgingCost: c, transferCostIn: t }),
                k,
              );
            }
          }
        }
        countS[j]![p] = combinations;
      }
    }

    best.push(bestS);
    count.push(countS);
  }

  const plansBySwitchCount = best.map((layer) => topK(layer[N]!.flat(), k));
  return {
    plans: topK(plansBySwitchCount.flat(), k),
    plansBySwitchCount,
    validPlanCount: count.reduce((sum, layer) => sum + layer[N]!.reduce((a, b) => a + b, 0), 0),
  };
}

/** Total order on plans: cheaper first, then fewer switches, then earlier dates / lower property index. */
export function comparePlans(a: RankedPlan, b: RankedPlan): number {
  if (a.totalCost !== b.totalCost) return a.totalCost - b.totalCost;
  if (a.switchCount !== b.switchCount) return a.switchCount - b.switchCount;
  for (let x = 0; x < a.segments.length; x++) {
    const sa = a.segments[x]!;
    const sb = b.segments[x]!;
    if (sa.to !== sb.to) return sa.to - sb.to;
    if (sa.propertyIndex !== sb.propertyIndex) return sa.propertyIndex - sb.propertyIndex;
  }
  return 0;
}

function appendSegment(prefix: RankedPlan | null, segment: PlanSegment): RankedPlan {
  const segments = prefix ? [...prefix.segments, segment] : [segment];
  const lodgingCost = (prefix?.lodgingCost ?? 0) + segment.lodgingCost;
  const transferCost = (prefix?.transferCost ?? 0) + segment.transferCostIn;
  return {
    segments,
    switchCount: segments.length - 1,
    lodgingCost,
    transferCost,
    totalCost: lodgingCost + transferCost,
  };
}

/** Inserts into a list kept sorted by `comparePlans` and capped at k entries. */
function insertBounded(list: RankedPlan[], plan: RankedPlan, k: number): void {
  if (list.length === k && comparePlans(plan, list[k - 1]!) >= 0) return;
  let position = list.length;
  while (position > 0 && comparePlans(plan, list[position - 1]!) < 0) position--;
  list.splice(position, 0, plan);
  if (list.length > k) list.pop();
}

function topK(plans: readonly RankedPlan[], k: number): RankedPlan[] {
  return [...plans].sort(comparePlans).slice(0, k);
}

function buildTransferMatrix(table: QuoteTable, model: TransferCostModel): Float64Array {
  const { properties } = table;
  const P = properties.length;
  const matrix = new Float64Array(P * P);
  for (let q = 0; q < P; q++) {
    for (let p = 0; p < P; p++) {
      if (p === q) continue;
      const cost = Math.round(model(properties[q]!, properties[p]!));
      if (!Number.isFinite(cost) || cost < 0) {
        throw new RangeError(`Transfer cost must be a non-negative number, got ${cost}`);
      }
      matrix[q * P + p] = cost;
    }
  }
  return matrix;
}

function assertInteger(value: number, min: number, name: string): void {
  if (!Number.isInteger(value) || value < min) {
    throw new RangeError(`${name} must be an integer ≥ ${min}, got ${value}`);
  }
}
