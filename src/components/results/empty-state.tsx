import { CalendarXIcon, FilterXIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { EmptyReason, SearchQuery, SearchResult } from "@/domain/search";
import { formatMoney } from "@/lib/format";
import { EMPTY_STATE_COPY } from "@/lib/messages";
import { searchHref } from "@/lib/search-params";

const ICONS: Record<EmptyReason, typeof CalendarXIcon> = {
  "no-matching-properties": FilterXIcon,
  "no-availability": CalendarXIcon,
  "over-budget": WalletIcon,
};

interface Suggestion {
  readonly label: string;
  readonly href: string;
}

/** Each empty result explains why and offers one-click ways out, built from the same query. */
function suggestionsFor(reason: EmptyReason, query: SearchQuery): Suggestion[] {
  switch (reason) {
    case "no-matching-properties":
      return [
        ...(query.propertyTypes.length > 0 ? [{ label: "Tüm konaklama türlerini ara", href: searchHref(query, { propertyTypes: [] }) }] : []),
        ...(query.adults > 2 ? [{ label: "2 yetişkin için ara", href: searchHref(query, { adults: 2 }) }] : []),
      ];
    case "no-availability":
      return [
        ...(query.maxSwitches === 0 ? [{ label: "Otel değişikliğine izin ver", href: searchHref(query, { maxSwitches: 1 }) }] : []),
        ...(query.propertyTypes.length > 0 ? [{ label: "Tüm konaklama türlerini ara", href: searchHref(query, { propertyTypes: [] }) }] : []),
      ];
    case "over-budget":
      return [
        { label: "Bütçesiz ara", href: searchHref(query, { budget: null }) },
        ...(query.maxSwitches === 0 ? [{ label: "Otel değişikliğine izin ver", href: searchHref(query, { maxSwitches: 1 }) }] : []),
      ];
  }
}

export function EmptyState({ result, reason }: { result: SearchResult; reason: EmptyReason }) {
  const Icon = ICONS[reason];
  const copy = EMPTY_STATE_COPY[reason];
  const suggestions = suggestionsFor(reason, result.query);
  const cheapest = [result.bestSingle, result.bestSplit]
    .filter((plan) => plan !== null)
    .sort((a, b) => a.totalCost.amount - b.totalCost.amount)[0];

  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
        {reason === "over-budget" && cheapest && (
          <p className="mt-2 text-sm">
            En uygun seçenek <span className="font-semibold">{formatMoney(cheapest.totalCost)}</span>.
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((suggestion) => (
          <Link key={suggestion.href} href={suggestion.href} className={buttonVariants({ variant: "outline" })}>
            {suggestion.label}
          </Link>
        ))}
        <Link href="#search-form" className={buttonVariants({ variant: "ghost" })}>
          Tarihleri değiştir
        </Link>
      </div>
    </section>
  );
}
