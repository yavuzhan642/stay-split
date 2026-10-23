import type { PropertyType } from "@/domain/property";
import type { EmptyReason, Recommendation, SearchResult } from "@/domain/search";
import { formatDay, formatMoney, formatPercent } from "./format";

/** User-facing copy in one place, shared by the web UI and the terminal demo. */

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  hotel: "Otel",
  hostel: "Hostel",
  apartment: "Apart",
};

export interface Copy {
  readonly title: string;
  readonly body: string;
}

/** Headline and explanation for the recommendation, with the numbers that justify it. */
export function recommendationCopy(recommendation: Recommendation, result: SearchResult): Copy {
  const { savings, savingsBeforeTransfer } = recommendation;
  const splitSavings = result.bestSplit?.savingsVsBestSingle;
  const switchDate = result.recommended?.transfers[0]?.date;

  switch (recommendation.reason) {
    case "split-saves-money":
      return {
        title: savings ? `Konaklamanı böl, ${formatMoney(savings.amount)} tasarruf et` : "Konaklamanı böl",
        body:
          (savings ? `En iyi tek otel seçeneğinden ${formatPercent(savings.percent)} daha ucuz. ` : "") +
          (switchDate ? `${formatDay(switchDate)} günü otel değiştireceksin.` : ""),
      };
    case "no-single-available":
      return {
        title: "Tüm geceler için müsait tek bir tesis yok",
        body: "Bu tarihlerde konaklamanı tamamlamanın yolu onu iki tesise bölmek.",
      };
    case "single-only-requested":
      return {
        title: "Tek tesiste en uygun seçenek",
        body: "Otel değiştirmek istemediğin için yalnızca tüm geceler boyunca müsait tesisler değerlendirildi.",
      };
    case "no-split-available":
      return {
        title: "Tek otelde kalmak en iyisi",
        body: "Bu tarihler için geçerli bir bölünmüş konaklama kombinasyonu bulunamadı.",
      };
    case "tie-prefers-fewer-switches":
      return {
        title: "Tek otel: aynı fiyat, daha az zahmet",
        body: "En ucuz bölünmüş konaklama da aynı fiyatta. Otel değiştirmeye değmez.",
      };
    case "savings-below-threshold":
      return {
        title: "Tek otelde kal: bölmek çok az kazandırıyor",
        body: splitSavings
          ? `Bölünmüş konaklama yalnızca ${formatMoney(splitSavings.amount)} (${formatPercent(splitSavings.percent)}) daha ucuz. Bu fark, otel değiştirmenin zahmetine değmez.`
          : "Bölünmüş konaklamanın sağladığı tasarruf, otel değiştirmenin zahmetine değmez.",
      };
    case "transfer-cost-cancels-savings":
      return {
        title: "Transfer maliyeti tasarrufu siliyor",
        body: savingsBeforeTransfer
          ? `Bölmek konaklamada ${formatMoney(savingsBeforeTransfer)} kazandırırdı, ama tahmini transfer maliyetiyle tek otel daha uygun.`
          : "Tahmini transfer maliyeti eklendiğinde tek otel daha uygun.",
      };
    case "single-is-cheapest":
      return {
        title: "Tek otelde kalmak daha ucuz",
        body: "Bölünmüş kombinasyonların hiçbiri bu tesisten daha uygun değil.",
      };
  }
}

export const EMPTY_STATE_COPY: Record<EmptyReason, Copy> = {
  "no-matching-properties": {
    title: "Filtrelerine uyan tesis bulunamadı",
    body: "Bu şehirde seçtiğin konaklama türünde ve kişi sayısına uygun tesis yok.",
  },
  "no-availability": {
    title: "Bu tarihler için uygun kombinasyon yok",
    body: "Tesislerin hiçbiri, tek başına ya da birlikte, seçtiğin tüm geceleri kapsamıyor.",
  },
  "over-budget": {
    title: "Seçenekler bütçeni aşıyor",
    body: "Bu tarihler için uygun planlar var, ama hepsi belirlediğin bütçenin üzerinde.",
  },
};
