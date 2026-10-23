import { toIsoDate } from "@/domain/dates";
import { fromMajorUnits } from "@/domain/money";
import type { Property } from "@/domain/property";
import type { StayQuote } from "@/domain/quote";
import type { SearchQuery } from "@/domain/search";
import type {
  AccommodationProvider,
  PropertySearchCriteria,
  ProviderInfo,
  QuoteRequest,
} from "@/providers/types";

/** Properties a few km apart in Istanbul, so distance-based transfers are non-zero. */
const LOCATIONS = [
  { lat: 41.0258, lng: 28.9741 },
  { lat: 41.006, lng: 28.977 },
  { lat: 41.043, lng: 29.007 },
  { lat: 40.985, lng: 29.0265 },
  { lat: 41.0368, lng: 28.9862 },
];

export function makeProperty(id: string, overrides: Partial<Property> = {}): Property {
  const index = id.charCodeAt(id.length - 1) % LOCATIONS.length;
  return {
    id,
    providerId: "test",
    name: `Otel ${id}`,
    type: "hotel",
    cityId: "istanbul",
    neighborhood: "Test",
    location: LOCATIONS[index]!,
    rating: 8,
    reviewCount: 100,
    maxGuests: 4,
    amenities: [],
    ...overrides,
  };
}

/** A quote priced in whole TRY, e.g. makeQuote("A", "2027-01-20", "2027-01-23", 4500). */
export function makeQuote(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  totalTry: number,
  overrides: Partial<StayQuote> = {},
): StayQuote {
  return {
    id: `test:${propertyId}:${checkIn}:${checkOut}`,
    providerId: "test",
    propertyId,
    checkIn: toIsoDate(checkIn),
    checkOut: toIsoDate(checkOut),
    adults: 2,
    total: fromMajorUnits(totalTry, "TRY"),
    breakdown: [],
    bookingUrl: null,
    retrievedAt: "2026-10-24T00:00:00.000Z",
    ...overrides,
  };
}

export function makeQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
  return {
    cityId: "istanbul",
    checkIn: toIsoDate("2027-01-20"),
    checkOut: toIsoDate("2027-01-23"),
    adults: 2,
    propertyTypes: [],
    maxSwitches: 1,
    budget: null,
    includeTransferCost: false,
    currency: "TRY",
    ...overrides,
  };
}

/**
 * A provider backed by a fixed list of quotes. Like a real API it only
 * returns quotes for the stays actually requested, so a test fails if the
 * service forgets to ask for an interval it needs.
 */
export class InMemoryProvider implements AccommodationProvider {
  readonly info: ProviderInfo = { id: "test", name: "Test data", isDemo: true };
  readonly quoteRequests: QuoteRequest[] = [];

  constructor(
    private readonly properties: readonly Property[],
    private readonly quotes: readonly StayQuote[],
  ) {}

  async searchProperties(criteria: PropertySearchCriteria): Promise<Property[]> {
    return this.properties.filter(
      (property) =>
        property.cityId === criteria.cityId &&
        property.maxGuests >= criteria.adults &&
        (criteria.propertyTypes.length === 0 || criteria.propertyTypes.includes(property.type)),
    );
  }

  async getQuotes(request: QuoteRequest): Promise<StayQuote[]> {
    this.quoteRequests.push(request);
    const wanted = new Set(request.stays.map((stay) => `${stay.checkIn}|${stay.checkOut}`));
    return this.quotes.filter(
      (quote) =>
        request.propertyIds.includes(quote.propertyId) && wanted.has(`${quote.checkIn}|${quote.checkOut}`),
    );
  }
}
