import type { SearchQuery } from "@/domain/search";
import type { SearchQueryInput } from "@/services/search-query";

/**
 * URL parameter names for every search field. The search lives in the URL
 * (GET form, `/search?city=…`), so results can be shared, bookmarked and
 * reloaded, and the back button works. Form inputs use these same names.
 */
export const SEARCH_PARAM = {
  cityId: "city",
  checkIn: "checkIn",
  checkOut: "checkOut",
  adults: "adults",
  propertyTypes: "types",
  maxSwitches: "switches",
  budget: "budget",
  includeTransferCost: "transfer",
} as const satisfies Record<keyof SearchQueryInput, string>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Raw URL params → untrusted input for `validateSearchQuery`. */
export function searchParamsToInput(params: RawSearchParams): SearchQueryInput {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    cityId: first(SEARCH_PARAM.cityId),
    checkIn: first(SEARCH_PARAM.checkIn),
    checkOut: first(SEARCH_PARAM.checkOut),
    adults: first(SEARCH_PARAM.adults),
    // Checkboxes submit one `types=` entry per checked box.
    propertyTypes: params[SEARCH_PARAM.propertyTypes],
    maxSwitches: first(SEARCH_PARAM.maxSwitches),
    budget: first(SEARCH_PARAM.budget),
    includeTransferCost: first(SEARCH_PARAM.includeTransferCost),
  };
}

/** Initial values for the search form: what the user last submitted, even if it was invalid. */
export interface SearchFormDefaults {
  readonly city?: string;
  readonly checkIn?: string;
  readonly checkOut?: string;
  readonly adults?: string;
  readonly types?: readonly string[];
  readonly switches?: string;
  readonly budget?: string;
  readonly transfer?: boolean;
}

export function formDefaults(params: RawSearchParams): SearchFormDefaults {
  const input = searchParamsToInput(params);
  const text = (value: unknown) => (typeof value === "string" ? value : undefined);
  const types = input.propertyTypes;
  return {
    city: text(input.cityId),
    checkIn: text(input.checkIn),
    checkOut: text(input.checkOut),
    adults: text(input.adults),
    types: typeof types === "string" ? [types] : Array.isArray(types) ? types : undefined,
    switches: text(input.maxSwitches),
    budget: text(input.budget),
    transfer: input.includeTransferCost === "1" || input.includeTransferCost === "true",
  };
}

/** A validated query → URL params; the exact inverse of `searchParamsToInput` + validation. */
export function queryToSearchParams(query: SearchQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set(SEARCH_PARAM.cityId, query.cityId);
  params.set(SEARCH_PARAM.checkIn, query.checkIn);
  params.set(SEARCH_PARAM.checkOut, query.checkOut);
  params.set(SEARCH_PARAM.adults, String(query.adults));
  for (const type of query.propertyTypes) params.append(SEARCH_PARAM.propertyTypes, type);
  params.set(SEARCH_PARAM.maxSwitches, String(query.maxSwitches));
  if (query.budget) params.set(SEARCH_PARAM.budget, String(query.budget.amount / 100));
  if (query.includeTransferCost) params.set(SEARCH_PARAM.includeTransferCost, "1");
  return params;
}

/** `/search?…` for the same query with some fields changed, e.g. for "try without a budget" links. */
export function searchHref(query: SearchQuery, changes: Partial<SearchQuery> = {}): string {
  return `/search?${queryToSearchParams({ ...query, ...changes }).toString()}`;
}

/** Stable identity of a search, independent of parameter order. */
export function searchKey(params: RawSearchParams): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
}
