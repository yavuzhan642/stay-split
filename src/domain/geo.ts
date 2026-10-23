export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance via the haversine formula. It is the straight-line
 * distance, so it underestimates the road distance; transfer cost models
 * account for that with their per-km rate.
 */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
