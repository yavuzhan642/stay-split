import type { MockPropertySeed } from "../types";
import { CAIRO_PROPERTIES } from "./cairo";
import { ISTANBUL_PROPERTIES } from "./istanbul";
import { ROME_PROPERTIES } from "./rome";

export { CITY_PROFILES } from "./city-profiles";

export const MOCK_PROPERTIES: readonly MockPropertySeed[] = [
  ...ISTANBUL_PROPERTIES,
  ...CAIRO_PROPERTIES,
  ...ROME_PROPERTIES,
];
