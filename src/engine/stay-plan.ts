import { distanceKm } from "@/domain/geo";
import { money, type CurrencyCode } from "@/domain/money";
import type { Savings, StayPlan, StaySegment, TransferLeg } from "@/domain/search";
import type { RankedPlan } from "./optimizer";
import type { QuoteTable } from "./quote-table";

export interface StayPlanContext {
  readonly table: QuoteTable;
  /** Total of the cheapest single-property plan, null if none exists. */
  readonly bestSingleCost: number | null;
  /** In minor units; null = no budget. */
  readonly budget: number | null;
}

/** Turns the optimizer's index-based plan into dated segments with properties and quotes. */
export function toStayPlan(plan: RankedPlan, context: StayPlanContext): StayPlan {
  const { table } = context;
  const currency = table.currency;

  const segments: StaySegment[] = plan.segments.map((segment) => {
    const property = table.properties[segment.propertyIndex];
    const quote = table.quote(segment.propertyIndex, segment.from, segment.to);
    if (!property || !quote) throw new Error("Optimizer returned a segment without a property or quote");
    return {
      property,
      quote,
      checkIn: table.dateAt(segment.from),
      checkOut: table.dateAt(segment.to),
      nights: segment.to - segment.from,
    };
  });

  const transfers: TransferLeg[] = segments.slice(1).map((segment, index) => {
    const previous = segments[index]!;
    return {
      fromPropertyId: previous.property.id,
      toPropertyId: segment.property.id,
      date: segment.checkIn,
      distanceKm: Math.round(distanceKm(previous.property.location, segment.property.location) * 10) / 10,
      estimatedCost: money(plan.segments[index + 1]!.transferCostIn, currency),
    };
  });

  return {
    id: segments.map((s) => `${s.property.id}@${s.checkIn}..${s.checkOut}`).join("+"),
    segments,
    transfers,
    switchCount: plan.switchCount,
    lodgingCost: money(plan.lodgingCost, currency),
    transferCost: money(plan.transferCost, currency),
    totalCost: money(plan.totalCost, currency),
    savingsVsBestSingle: savingsAgainst(context.bestSingleCost, plan.totalCost, currency),
    withinBudget: context.budget === null || plan.totalCost <= context.budget,
  };
}

export function savingsAgainst(baseline: number | null, cost: number, currency: CurrencyCode): Savings | null {
  if (baseline === null || baseline <= 0) return null;
  const amount = baseline - cost;
  return { amount: money(amount, currency), percent: Math.round((amount / baseline) * 1000) / 10 };
}
