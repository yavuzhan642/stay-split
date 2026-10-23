import type { PropertyType } from "@/domain/property";
import type { MockPropertySeed, MockRates, MockStayRules } from "../types";

type SeedInput = Omit<MockPropertySeed, "type" | "maxGuests" | "amenities" | "rates" | "rules"> & {
  readonly maxGuests?: number;
  readonly amenities?: readonly string[];
  readonly rates: Partial<MockRates> & Pick<MockRates, "baseNightly">;
  readonly rules?: Partial<MockStayRules>;
};

interface TypeDefaults {
  readonly maxGuests: number;
  readonly amenities: readonly string[];
  readonly rates: Omit<MockRates, "baseNightly" | "extraGuestNightly">;
  readonly extraGuestShare: number;
  readonly rules: MockStayRules;
}

/** Typical conventions per property type, so each seed only lists what makes it different. */
const DEFAULTS: Record<PropertyType, TypeDefaults> = {
  hotel: {
    maxGuests: 3,
    amenities: ["Ücretsiz Wi-Fi", "24 saat resepsiyon", "Klima"],
    rates: {
      pricing: "per-room",
      includedGuests: 2,
      weekendUplift: 0.15,
      volatility: 0.12,
      cleaningFee: 0,
      lengthOfStayDiscounts: [],
    },
    extraGuestShare: 0.25,
    rules: { minNights: 1, soldOutRate: 0.12, blockedNights: [] },
  },
  hostel: {
    maxGuests: 4,
    amenities: ["Ücretsiz Wi-Fi", "Ortak mutfak", "Kilitli dolap"],
    rates: {
      pricing: "per-person",
      includedGuests: 1,
      weekendUplift: 0.2,
      volatility: 0.15,
      cleaningFee: 0,
      lengthOfStayDiscounts: [],
    },
    extraGuestShare: 0,
    rules: { minNights: 1, soldOutRate: 0.15, blockedNights: [] },
  },
  apartment: {
    maxGuests: 4,
    amenities: ["Ücretsiz Wi-Fi", "Mutfak", "Çamaşır makinesi"],
    rates: {
      pricing: "per-room",
      includedGuests: 4,
      weekendUplift: 0.1,
      volatility: 0.08,
      cleaningFee: 600,
      lengthOfStayDiscounts: [{ minNights: 7, percent: 12 }],
    },
    extraGuestShare: 0,
    rules: { minNights: 2, soldOutRate: 0.18, blockedNights: [] },
  },
};

function seed(type: PropertyType, input: SeedInput): MockPropertySeed {
  const defaults = DEFAULTS[type];
  return {
    ...input,
    type,
    maxGuests: input.maxGuests ?? defaults.maxGuests,
    amenities: input.amenities ?? defaults.amenities,
    rates: {
      ...defaults.rates,
      extraGuestNightly: Math.round(input.rates.baseNightly * defaults.extraGuestShare),
      ...input.rates,
    },
    rules: { ...defaults.rules, ...input.rules },
  };
}

export const hotel = (input: SeedInput) => seed("hotel", input);
export const hostel = (input: SeedInput) => seed("hostel", input);
export const apartment = (input: SeedInput) => seed("apartment", input);
