import { describe, expect, it } from "vitest";
import { CITIES } from "@/domain/cities";
import { addDays, eachNight, toIsoDate, type IsoDate } from "@/domain/dates";
import { distanceKm } from "@/domain/geo";
import type { StayQuote } from "@/domain/quote";
import { ProviderError } from "../types";
import { MOCK_PROPERTIES } from "./data";
import { apartment, hotel } from "./data/seed-helpers";
import { MockAccommodationProvider } from "./mock-provider";

const D = toIsoDate;

/** Scenario properties with no random sell-outs, so expectations are exact. */
const LOFT = apartment({
  id: "test-loft",
  name: "Test Loft",
  cityId: "istanbul",
  neighborhood: "Cihangir",
  location: { lat: 41.0315, lng: 28.983 },
  rating: 9,
  reviewCount: 10,
  maxGuests: 3,
  rates: { baseNightly: 3000, cleaningFee: 600 },
  rules: { minNights: 2, soldOutRate: 0 },
});
const HOTEL = hotel({
  id: "test-hotel",
  name: "Test Hotel",
  cityId: "istanbul",
  neighborhood: "Galata",
  location: { lat: 41.0258, lng: 28.9741 },
  rating: 8.5,
  reviewCount: 10,
  rates: { baseNightly: 3000, lengthOfStayDiscounts: [{ minNights: 3, percent: 10 }] },
  rules: { soldOutRate: 0, blockedNights: ["2027-01-25"] },
});

const scenario = new MockAccommodationProvider({ properties: [LOFT, HOTEL] });

async function quote(propertyId: string, checkIn: IsoDate, checkOut: IsoDate, adults = 2): Promise<StayQuote | undefined> {
  const [result] = await scenario.getQuotes({ propertyIds: [propertyId], stays: [{ checkIn, checkOut }], adults, currency: "TRY" });
  return result;
}

describe("MockAccommodationProvider", () => {
  it("ships a sane catalogue for every MVP city", () => {
    const ids = MOCK_PROPERTIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const city of CITIES) {
      const inCity = MOCK_PROPERTIES.filter((p) => p.cityId === city.id);
      expect(new Set(inCity.map((p) => p.type))).toEqual(new Set(["hotel", "hostel", "apartment"]));
      for (const property of inCity) expect(distanceKm(property.location, city.center)).toBeLessThan(30);
    }
  });

  it("filters properties by city, type and capacity", async () => {
    const provider = new MockAccommodationProvider();
    const hostels = await provider.searchProperties({ cityId: "rome", adults: 2, propertyTypes: ["hostel"] });
    expect(hostels.length).toBeGreaterThan(0);
    expect(hostels.every((p) => p.cityId === "rome" && p.type === "hostel")).toBe(true);

    const big = await provider.searchProperties({ cityId: "istanbul", adults: 5, propertyTypes: [] });
    expect(big.every((p) => p.maxGuests >= 5)).toBe(true);
  });

  it("returns the same prices for the same request", async () => {
    const provider = new MockAccommodationProvider({ now: () => new Date("2026-10-24T00:00:00Z") });
    const request = {
      propertyIds: MOCK_PROPERTIES.map((p) => p.id),
      stays: [{ checkIn: D("2027-01-20"), checkOut: D("2027-01-23") }],
      adults: 2,
      currency: "TRY" as const,
    };
    expect(await provider.getQuotes(request)).toEqual(await provider.getQuotes(request));
  });

  it("itemises every quote so that the lines add up to the total", async () => {
    const provider = new MockAccommodationProvider();
    const quotes = await provider.getQuotes({
      propertyIds: MOCK_PROPERTIES.map((p) => p.id),
      stays: [
        { checkIn: D("2027-04-08"), checkOut: D("2027-04-11") },
        { checkIn: D("2027-04-08"), checkOut: D("2027-04-16") },
      ],
      adults: 2,
      currency: "TRY",
    });
    expect(quotes.length).toBeGreaterThan(10);
    for (const q of quotes) {
      expect(q.breakdown.reduce((sum, line) => sum + line.amount.amount, 0)).toBe(q.total.amount);
      expect(q.total.amount).toBeGreaterThan(0);
    }
  });

  it("prices a stay as a whole, not as a sum of nights", async () => {
    // Length-of-stay discount: 3 nights cost less than three 1-night stays.
    const whole = await quote(HOTEL.id, D("2027-01-20"), D("2027-01-23"));
    const nights = await Promise.all(eachNight(D("2027-01-20"), D("2027-01-23")).map((n) => quote(HOTEL.id, n, addDays(n, 1))));
    const sumOfNights = nights.reduce((sum, q) => sum + q!.total.amount, 0);
    expect(whole!.total.amount).toBeLessThan(sumOfNights);
    expect(whole!.breakdown.some((line) => line.kind === "discount")).toBe(true);

    // Per-stay cleaning fee: two 2-night stays pay it twice.
    const four = await quote(LOFT.id, D("2027-01-20"), D("2027-01-24"));
    const firstHalf = await quote(LOFT.id, D("2027-01-20"), D("2027-01-22"));
    const secondHalf = await quote(LOFT.id, D("2027-01-22"), D("2027-01-24"));
    expect(firstHalf!.total.amount + secondHalf!.total.amount - four!.total.amount).toBeGreaterThanOrEqual(600_00);
  });

  it("enforces minimum stays, sold-out nights and capacity by not quoting", async () => {
    expect(await quote(LOFT.id, D("2027-01-20"), D("2027-01-21"))).toBeUndefined(); // min 2 nights
    expect(await quote(LOFT.id, D("2027-01-20"), D("2027-01-22"))).toBeDefined();
    expect(await quote(HOTEL.id, D("2027-01-24"), D("2027-01-26"))).toBeUndefined(); // 25th sold out
    expect(await quote(HOTEL.id, D("2027-01-26"), D("2027-01-28"))).toBeDefined();
    expect(await quote(LOFT.id, D("2027-01-20"), D("2027-01-22"), 4)).toBeUndefined(); // sleeps 3
  });

  it("never invents booking links", async () => {
    const provider = new MockAccommodationProvider();
    const quotes = await provider.getQuotes({
      propertyIds: MOCK_PROPERTIES.map((p) => p.id),
      stays: [{ checkIn: D("2027-06-10"), checkOut: D("2027-06-13") }],
      adults: 1,
      currency: "TRY",
    });
    expect(quotes.every((q) => q.bookingUrl === null)).toBe(true);
    expect(provider.info.isDemo).toBe(true);
  });

  it("rejects currencies it cannot price", async () => {
    await expect(
      scenario.getQuotes({ propertyIds: [HOTEL.id], stays: [], adults: 2, currency: "EUR" }),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it("stops when the caller aborts", async () => {
    const slow = new MockAccommodationProvider({ latencyMs: 1_000 });
    const controller = new AbortController();
    const pending = slow.searchProperties({ cityId: "rome", adults: 2, propertyTypes: [] }, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
