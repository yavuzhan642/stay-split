import type { GeoPoint } from "./geo";

export interface City {
  readonly id: string;
  readonly name: string;
  readonly country: string;
  readonly center: GeoPoint;
  readonly timeZone: string;
}

/** Cities the MVP can search. A real provider covers thousands; this list then comes from the provider. */
export const CITIES = [
  {
    id: "istanbul",
    name: "İstanbul",
    country: "Türkiye",
    center: { lat: 41.0082, lng: 28.9784 },
    timeZone: "Europe/Istanbul",
  },
  {
    id: "cairo",
    name: "Kahire",
    country: "Mısır",
    center: { lat: 30.0444, lng: 31.2357 },
    timeZone: "Africa/Cairo",
  },
  {
    id: "rome",
    name: "Roma",
    country: "İtalya",
    center: { lat: 41.9028, lng: 12.4964 },
    timeZone: "Europe/Rome",
  },
] as const satisfies readonly City[];

export type CityId = (typeof CITIES)[number]["id"];

export function findCity(id: string): City | undefined {
  return CITIES.find((city) => city.id === id);
}
