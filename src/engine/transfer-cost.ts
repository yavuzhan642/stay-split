import { distanceKm } from "@/domain/geo";
import type { Property } from "@/domain/property";

/** Estimated cost of moving from one property to another, in minor units of the search currency. */
export type TransferCostModel = (from: Property, to: Property) => number;

export const noTransferCost: TransferCostModel = () => 0;

export function flatTransferCost(amount: number): TransferCostModel {
  return () => amount;
}

export interface DistanceBasedTransferOptions {
  readonly baseFee: number;
  readonly perKm: number;
  readonly minimumFee: number;
}

/** Taxi-style estimate: base fee plus a per-km rate on the straight-line distance, with a floor. */
export function distanceBasedTransferCost(options: DistanceBasedTransferOptions): TransferCostModel {
  return (from, to) => {
    const estimate = options.baseFee + options.perKm * distanceKm(from.location, to.location);
    return Math.max(options.minimumFee, Math.round(estimate));
  };
}
