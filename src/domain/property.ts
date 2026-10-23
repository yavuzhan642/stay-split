import type { GeoPoint } from "./geo";

export const PROPERTY_TYPES = ["hotel", "hostel", "apartment"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** A bookable accommodation, as described by a provider. Prices live on quotes, not here. */
export interface Property {
  /** Unique within its provider. */
  readonly id: string;
  readonly providerId: string;
  readonly name: string;
  readonly type: PropertyType;
  readonly cityId: string;
  readonly neighborhood: string;
  readonly location: GeoPoint;
  /** Guest review score on a 0–10 scale; null when the property has no reviews yet. */
  readonly rating: number | null;
  readonly reviewCount: number;
  readonly maxGuests: number;
  readonly amenities: readonly string[];
}
