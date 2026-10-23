/**
 * Runs one search against the demo provider and prints the result, so the
 * engine can be tried before the UI exists:
 *
 *   npm run demo
 *   npm run demo -- --city rome --in 2027-05-12 --out 2027-05-17 --adults 2 --transfer
 *   npm run demo -- --city cairo --types hotel,hostel --switches 0 --budget 15000
 */
import { parseArgs } from "node:util";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { findCity } from "@/domain/cities";
import { addDays, todayInTimeZone, type IsoDate } from "@/domain/dates";
import { formatMoney } from "@/domain/money";
import type { EmptyReason, RecommendationReason, SearchResult, StayPlan } from "@/domain/search";
import { createAccommodationProvider } from "@/providers/registry";
import { validateSearchQuery } from "@/services/search-query";
import { searchStays } from "@/services/search-stays";

const REASONS: Record<RecommendationReason, string> = {
  "split-saves-money": "Konaklamayı bölmek, en iyi tek otelden belirgin şekilde daha ucuz.",
  "no-single-available": "Hiçbir tesis tüm geceler için müsait değil; bölmek tek seçenek.",
  "single-only-requested": "Otel değiştirmek istemediğin için yalnızca tek tesis arandı.",
  "no-split-available": "Geçerli bir bölünmüş konaklama bulunamadı.",
  "tie-prefers-fewer-switches": "Bölünmüş konaklama aynı fiyatta; otel değiştirmeye değmez.",
  "savings-below-threshold": "Bölmek biraz daha ucuz ama tasarruf otel değiştirmeye değecek kadar büyük değil.",
  "transfer-cost-cancels-savings": "Bölmek konaklamada ucuz olurdu ama tahmini transfer maliyeti tasarrufu siliyor.",
  "single-is-cheapest": "Tek otelde kalmak en ucuz seçenek.",
};

const EMPTY_REASONS: Record<EmptyReason, string> = {
  "no-matching-properties": "Seçtiğin filtrelere uyan tesis yok.",
  "no-availability": "Bu tarihlerin tüm gecelerini kapsayan bir kombinasyon bulunamadı.",
  "over-budget": "Uygun planlar var ama hepsi bütçeni aşıyor.",
};

const { values } = parseArgs({
  options: {
    city: { type: "string", default: "istanbul" },
    in: { type: "string" },
    out: { type: "string" },
    adults: { type: "string", default: "2" },
    types: { type: "string" },
    switches: { type: "string", default: "1" },
    budget: { type: "string" },
    transfer: { type: "boolean", default: false },
  },
});

const day = (date: IsoDate) => format(parseISO(date), "d MMM yyyy", { locale: tr });
const shortDay = (date: IsoDate) => format(parseISO(date), "d MMM", { locale: tr });
const decimal = (value: number) => value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

async function main(): Promise<void> {
  // Default to a 4-night stay starting a month from today, so the demo never searches the past.
  const city = findCity(values.city);
  const defaultCheckIn = addDays(todayInTimeZone(city?.timeZone ?? "UTC"), 30);
  const checkIn = values.in ?? defaultCheckIn;

  const validation = validateSearchQuery({
    cityId: values.city,
    checkIn,
    checkOut: values.out ?? (checkIn === defaultCheckIn ? addDays(defaultCheckIn, 4) : undefined),
    adults: values.adults,
    propertyTypes: values.types,
    maxSwitches: values.switches,
    budget: values.budget,
    includeTransferCost: values.transfer,
  });
  if (!validation.ok) {
    for (const issue of validation.issues) console.error(`✗ ${issue.field}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }

  const result = await searchStays(validation.query, { provider: createAccommodationProvider() });
  print(result);
}

function print(result: SearchResult): void {
  const { query, stats } = result;
  const nights = result.alternatives[0]?.segments.reduce((sum, s) => sum + s.nights, 0);
  console.log(
    `\nStaySplit — ${findCity(query.cityId)?.name}, ${day(query.checkIn)} → ${day(query.checkOut)}` +
      `${nights ? ` (${nights} gece)` : ""}, ${query.adults} yetişkin`,
  );
  if (result.dataSource.isDemo) {
    console.log("⚠  DEMO VERİSİ: tesisler hayali, fiyatlar simülasyondur. Rezervasyon bağlantısı yoktur.");
  }

  if (!result.recommendation || !result.recommended) {
    console.log(`\nSonuç bulunamadı. ${result.emptyReason ? EMPTY_REASONS[result.emptyReason] : ""}`);
  } else {
    const { recommendation, recommended } = result;
    const kind = recommendation.kind === "split" ? "Bölünmüş konaklama" : "Tek otel";
    const savings = recommendation.savings
      ? ` (tek otele göre ${formatMoney(recommendation.savings.amount)} / %${decimal(recommendation.savings.percent)} tasarruf)`
      : "";
    console.log(`\nÖNERİ: ${kind} — ${formatMoney(recommended.totalCost)}${savings}`);
    console.log(`  ${REASONS[recommendation.reason]}`);
    if (recommendation.savingsBeforeTransfer) {
      console.log(`  Transfer hariç tasarruf: ${formatMoney(recommendation.savingsBeforeTransfer)}`);
    }
    printSegments(recommended);
  }

  if (result.bestSingle) console.log(`\nEn iyi tek otel:   ${summary(result.bestSingle)}`);
  if (result.bestSplit) console.log(`En ucuz bölünmüş:  ${summary(result.bestSplit)}`);

  if (result.alternatives.length > 0) {
    console.log("\nAlternatifler (ucuzdan pahalıya):");
    result.alternatives.forEach((plan, i) => console.log(`  ${String(i + 1).padStart(2)}. ${summary(plan)}`));
  }

  console.log(
    `\n${stats.propertiesConsidered} tesis · ${stats.stayIntervalsRequested} tarih aralığı · ` +
      `${stats.quotesReceived} teklif · ${stats.validCombinations} geçerli kombinasyon · ${stats.durationMs} ms`,
  );
  for (const warning of result.warnings) console.log(`! ${warning}`);
}

function printSegments(plan: StayPlan): void {
  plan.segments.forEach((segment, i) => {
    const { property } = segment;
    console.log(
      `  ${i + 1}) ${property.name} (${property.neighborhood}, ★ ${property.rating?.toFixed(1) ?? "–"})  ` +
        `${shortDay(segment.checkIn)} → ${shortDay(segment.checkOut)}, ${segment.nights} gece  ` +
        formatMoney(segment.quote.total),
    );
    const transfer = plan.transfers[i];
    if (transfer) {
      console.log(
        `     ↳ ${shortDay(transfer.date)} transfer: ${decimal(transfer.distanceKm)} km, tahmini ${formatMoney(transfer.estimatedCost)}`,
      );
    }
  });
}

function summary(plan: StayPlan): string {
  const parts = plan.segments.map((s) => `${s.property.name} ${shortDay(s.checkIn)}–${shortDay(s.checkOut)}`);
  const savings = plan.savingsVsBestSingle && plan.switchCount > 0 ? `, ${signedPercent(plan.savingsVsBestSingle.percent)}` : "";
  const budget = plan.withinBudget ? "" : " [bütçe dışı]";
  return `${formatMoney(plan.totalCost).padStart(12)}  ${parts.join(" + ")}${savings}${budget}`;
}

function signedPercent(percent: number): string {
  return percent >= 0 ? `%${decimal(percent)} tasarruf` : `%${decimal(-percent)} daha pahalı`;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
