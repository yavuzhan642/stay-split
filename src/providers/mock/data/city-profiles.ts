import type { CityId } from "@/domain/cities";
import type { CityPricingProfile } from "../types";

/**
 * Simplified, illustrative pricing conventions per city. They are inspired by
 * how each market works (Gulf-style Thursday/Friday weekend in Cairo, per-person
 * city tax in Rome, a percentage accommodation tax in Türkiye) but the numbers
 * are demo values, not current legal rates.
 */
export const CITY_PROFILES: Record<CityId, CityPricingProfile> = {
  istanbul: {
    weekendNights: [5, 6],
    seasonality: [0.85, 0.85, 0.95, 1.05, 1.1, 1.25, 1.3, 1.3, 1.15, 1.1, 0.95, 1.05],
    percentTaxes: [{ label: "Konaklama vergisi", percent: 2, appliesTo: ["hotel", "hostel", "apartment"] }],
    perPersonNightTax: null,
  },
  cairo: {
    weekendNights: [4, 5],
    seasonality: [1.2, 1.15, 1.15, 1.05, 0.95, 0.85, 0.85, 0.85, 0.9, 1.05, 1.15, 1.25],
    percentTaxes: [
      { label: "Servis bedeli", percent: 12, appliesTo: ["hotel"] },
      { label: "KDV", percent: 14, appliesTo: ["hotel"] },
    ],
    perPersonNightTax: null,
  },
  rome: {
    weekendNights: [5, 6],
    seasonality: [0.85, 0.85, 1.0, 1.2, 1.25, 1.25, 1.15, 1.05, 1.2, 1.2, 0.95, 1.1],
    percentTaxes: [],
    perPersonNightTax: {
      label: "Şehir vergisi (kişi başı, gecelik)",
      amountByType: { hotel: 400, hostel: 200, apartment: 250 },
    },
  },
};
