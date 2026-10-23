import { nightsBetween, type IsoDate } from "@/domain/dates";
import type { StayPlan } from "@/domain/search";

export interface PlanExpectations {
  readonly checkIn: IsoDate;
  readonly checkOut: IsoDate;
  readonly maxSwitches: number;
}

/**
 * Checks the guarantees every plan must satisfy and returns what is wrong
 * (empty = valid). The optimizer satisfies these by construction; checking
 * them again on the final output is cheap insurance against future bugs, and
 * the tests use the same function.
 */
export function findPlanViolations(plan: StayPlan, expected: PlanExpectations): string[] {
  const violations: string[] = [];
  const { segments } = plan;
  const first = segments[0];
  const last = segments.at(-1);
  if (!first || !last) return ["plan has no segments"];

  if (first.checkIn !== expected.checkIn) violations.push(`starts on ${first.checkIn}, not ${expected.checkIn}`);
  if (last.checkOut !== expected.checkOut) violations.push(`ends on ${last.checkOut}, not ${expected.checkOut}`);

  segments.forEach((segment, index) => {
    const nights = nightsBetween(segment.checkIn, segment.checkOut);
    if (nights < 1 || nights !== segment.nights) violations.push(`segment ${index} has an invalid night count`);
    const { quote } = segment;
    if (
      quote.propertyId !== segment.property.id ||
      quote.checkIn !== segment.checkIn ||
      quote.checkOut !== segment.checkOut
    ) {
      violations.push(`segment ${index} is priced with a quote for a different stay`);
    }

    const next = segments[index + 1];
    if (!next) return;
    const gap = nightsBetween(segment.checkOut, next.checkIn);
    if (gap > 0) violations.push(`${gap} uncovered night(s) between segments ${index} and ${index + 1}`);
    if (gap < 0) violations.push(`segments ${index} and ${index + 1} overlap by ${-gap} night(s)`);
    if (segment.property.id === next.property.id) violations.push(`segments ${index} and ${index + 1} use the same property`);
  });

  if (plan.switchCount !== segments.length - 1) violations.push("switchCount does not match the segments");
  if (plan.switchCount > expected.maxSwitches) violations.push(`${plan.switchCount} switches exceed the limit`);
  if (plan.transfers.length !== plan.switchCount) violations.push("transfer legs do not match the switches");

  const lodging = segments.reduce((sum, segment) => sum + segment.quote.total.amount, 0);
  const transfers = plan.transfers.reduce((sum, leg) => sum + leg.estimatedCost.amount, 0);
  if (lodging !== plan.lodgingCost.amount) violations.push("lodging cost is not the sum of the quotes");
  if (transfers !== plan.transferCost.amount) violations.push("transfer cost is not the sum of the legs");
  if (plan.totalCost.amount !== lodging + transfers) violations.push("total is not lodging + transfers");

  return violations;
}
