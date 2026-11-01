"use client";

import { CheckIcon, ChevronDownIcon, Loader2Icon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import Form from "next/form";
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CITIES, findCity } from "@/domain/cities";
import { addDays, isIsoDate, nightsBetween, todayInTimeZone, type IsoDate } from "@/domain/dates";
import { PROPERTY_TYPES } from "@/domain/property";
import { PROPERTY_TYPE_LABELS } from "@/lib/messages";
import { SEARCH_PARAM, type SearchFormDefaults } from "@/lib/search-params";
import { SEARCH_LIMITS, type SearchQueryInput, type ValidationIssue } from "@/services/search-query";

const DEFAULT_LEAD_DAYS = 21;
const DEFAULT_NIGHTS = 3;

const noSubscription = () => () => {};

/**
 * Today in the destination's time zone, or null while rendering on the
 * server. Pages are prerendered, and a date baked in at build time would be
 * stale by the time someone opens the page, so "now" is only read in the browser.
 */
function useToday(timeZone: string): IsoDate | null {
  return useSyncExternalStore(noSubscription, () => todayInTimeZone(timeZone), () => null);
}

interface SearchFormProps {
  readonly defaults?: SearchFormDefaults;
  readonly issues?: readonly ValidationIssue[];
  /** "hero" shows every option; "compact" folds the filters away, for the results page. */
  readonly variant?: "hero" | "compact";
}

/**
 * A plain GET form to /search: it works without JavaScript, and `next/form`
 * upgrades it to a client-side navigation when JavaScript is available.
 *
 * Layout: one white panel of fields on wide screens with a blue "Ara" button
 * at the end; on phones the same cells stack and the button goes full width.
 */
export function SearchForm({ defaults = {}, issues = [], variant = "hero" }: SearchFormProps) {
  const [city, setCity] = useState(defaults.city ?? CITIES[0].id);
  const today = useToday(findCity(city)?.timeZone ?? "UTC");

  // null = the user has not touched the field, so we show a suggestion.
  const [checkIn, setCheckIn] = useState<string | null>(defaults.checkIn ?? null);
  const [checkOut, setCheckOut] = useState<string | null>(defaults.checkOut ?? null);
  const checkInValue = checkIn ?? (today ? addDays(today, DEFAULT_LEAD_DAYS) : "");
  const checkOutValue = checkOut ?? (isIsoDate(checkInValue) ? addDays(checkInValue, DEFAULT_NIGHTS) : "");

  function changeCheckIn(value: string) {
    setCheckIn(value);
    // Moving check-in past check-out keeps the trip length instead of leaving an invalid range.
    if (isIsoDate(value) && (!isIsoDate(checkOutValue) || nightsBetween(value, checkOutValue) < 1)) {
      const nights =
        isIsoDate(checkInValue) && isIsoDate(checkOutValue)
          ? Math.max(1, nightsBetween(checkInValue, checkOutValue))
          : DEFAULT_NIGHTS;
      setCheckOut(addDays(value, nights));
    }
  }

  const errors: Partial<Record<keyof SearchQueryInput, string>> = {};
  for (const issue of issues) errors[issue.field] ??= issue.message;

  const selectedTypes = defaults.types ?? [];
  const activeFilters =
    (selectedTypes.length > 0 ? 1 : 0) + (defaults.switches === "0" ? 1 : 0) + (defaults.budget ? 1 : 0) + (defaults.transfer ? 1 : 0);
  const filterErrors = [errors.propertyTypes, errors.maxSwitches, errors.budget, errors.includeTransferCost].filter(Boolean);
  const compact = variant === "compact";

  const filters = (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <FilterGroup label="Tür">
          {PROPERTY_TYPES.map((type) => (
            <label
              key={type}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-line-strong bg-card px-3.5 text-sm font-medium transition-colors select-none hover:bg-subtle has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold has-checked:text-primary-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
            >
              <input
                type="checkbox"
                name={SEARCH_PARAM.propertyTypes}
                value={type}
                defaultChecked={selectedTypes.includes(type)}
                className="sr-only"
              />
              {PROPERTY_TYPE_LABELS[type]}
            </label>
          ))}
        </FilterGroup>

        <FilterGroup label="Otel değişikliği">
          <div className="inline-flex gap-2">
            {[
              { value: "0", label: "Tek otel" },
              { value: "1", label: "En fazla 1" },
            ].map((option) => (
              <label
                key={option.value}
                className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-line-strong bg-card px-3.5 text-sm font-medium transition-colors select-none hover:bg-subtle has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold has-checked:text-primary-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
              >
                <input
                  type="radio"
                  name={SEARCH_PARAM.maxSwitches}
                  value={option.value}
                  defaultChecked={(defaults.switches ?? "1") === option.value}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="Bütçe">
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              name={SEARCH_PARAM.budget}
              defaultValue={defaults.budget}
              min={1}
              step="any"
              placeholder="Sınırsız"
              aria-label="Toplam bütçe (TL)"
              aria-invalid={Boolean(errors.budget)}
              className="h-9 w-32 rounded-lg border border-line-strong bg-card pr-9 pl-3 text-sm tabular-nums outline-none placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus aria-invalid:border-2 aria-invalid:border-danger [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-muted">
              TL
            </span>
          </div>
        </FilterGroup>

        <label className="flex cursor-pointer items-start gap-3 select-none">
          {/* The native checkbox, drawn as a blue tick box. */}
          <span className="relative flex size-5 shrink-0">
            <input
              type="checkbox"
              name={SEARCH_PARAM.includeTransferCost}
              value="1"
              defaultChecked={defaults.transfer}
              className="peer size-5 cursor-pointer appearance-none rounded-sm border-[1.5px] border-line-strong bg-card checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
            <CheckIcon
              className="pointer-events-none absolute inset-0 m-auto size-3.5 text-on-primary opacity-0 [stroke-width:3] peer-checked:opacity-100"
              aria-hidden="true"
            />
          </span>
          <span className="text-sm leading-5">
            <span className="font-semibold">Transfer dahil</span>
            <span className="block text-[13px] leading-[18px] text-ink-muted">Oteller arası taksi</span>
          </span>
        </label>
      </div>

      {filterErrors.length > 0 && (
        <ul className="flex flex-col gap-1 text-[13px] text-danger" role="alert">
          {filterErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {!compact && (
        <p className="text-[13px] leading-[18px] text-ink-muted">
          Tür seçmezsen hepsi aranır. Her olası bölünme tarihini ve otel çiftini hesaplıyoruz; fiyatlar demo verisidir.
        </p>
      )}
    </div>
  );

  return (
    <Form
      action="/search"
      className="overflow-hidden rounded-xl bg-card text-ink shadow-panel"
    >
      <div className="grid divide-y divide-line md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_auto] md:divide-x md:divide-y-0">
        <BarField label="Şehir" error={errors.cityId}>
          {(describedBy) => (
            <div className="relative">
              <select
                name={SEARCH_PARAM.cityId}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                aria-invalid={Boolean(errors.cityId)}
                aria-describedby={describedBy}
                className={controlClass("appearance-none pr-6")}
              >
                {CITIES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}, {option.country}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            </div>
          )}
        </BarField>

        <BarField label="Giriş" error={errors.checkIn}>
          {(describedBy) => (
            <input
              type="date"
              name={SEARCH_PARAM.checkIn}
              value={checkInValue}
              onChange={(event) => changeCheckIn(event.target.value)}
              min={today ?? undefined}
              max={today ? addDays(today, SEARCH_LIMITS.maxDaysAhead) : undefined}
              required
              aria-invalid={Boolean(errors.checkIn)}
              aria-describedby={describedBy}
              className={controlClass("tabular-nums")}
            />
          )}
        </BarField>

        <BarField label="Çıkış" error={errors.checkOut}>
          {(describedBy) => (
            <input
              type="date"
              name={SEARCH_PARAM.checkOut}
              value={checkOutValue}
              onChange={(event) => setCheckOut(event.target.value)}
              min={isIsoDate(checkInValue) ? addDays(checkInValue, 1) : undefined}
              max={isIsoDate(checkInValue) ? addDays(checkInValue, SEARCH_LIMITS.maxNights) : undefined}
              required
              aria-invalid={Boolean(errors.checkOut)}
              aria-describedby={describedBy}
              className={controlClass("tabular-nums")}
            />
          )}
        </BarField>

        <BarField label="Kişi" error={errors.adults}>
          {(describedBy) => (
            <div className="relative">
              <select
                name={SEARCH_PARAM.adults}
                defaultValue={defaults.adults ?? "2"}
                aria-invalid={Boolean(errors.adults)}
                aria-describedby={describedBy}
                className={controlClass("appearance-none pr-6")}
              >
                {Array.from({ length: SEARCH_LIMITS.maxAdults }, (_, i) => String(i + 1)).map((count) => (
                  <option key={count} value={count}>
                    {count} yetişkin
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            </div>
          )}
        </BarField>

        <div className="flex p-3 md:border-l-0! md:p-2">
          <SubmitButton />
        </div>
      </div>

      <div className="border-t border-line">
        {compact ? (
          <details open={filterErrors.length > 0}>
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-link select-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-focus sm:px-5">
              <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
              Filtreler
              {activeFilters > 0 && <Badge variant="count">{activeFilters}</Badge>}
            </summary>
            <div className="border-t border-line">{filters}</div>
          </details>
        ) : (
          filters
        )}
      </div>
    </Form>
  );
}

function controlClass(extra?: string) {
  return cn(
    "w-full min-w-0 bg-transparent text-base leading-6 font-semibold text-ink outline-none",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40 hover:[&::-webkit-calendar-picker-indicator]:opacity-70",
    extra,
  );
}

/** One cell of the search bar: small caption on top, the value below, the whole cell clickable. */
function BarField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const errorId = useId();
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col justify-center gap-1 px-4 py-3 transition-colors hover:bg-subtle focus-within:shadow-[inset_0_-3px_0_var(--focus)] sm:px-5",
        error && "bg-danger-soft",
      )}
    >
      <span className={cn("text-xs font-semibold", error ? "text-danger" : "text-ink-muted")}>{label}</span>
      {children(error ? errorId : undefined)}
      {error && (
        <span id={errorId} className="text-[13px] leading-[18px] text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="float-left mr-1 text-sm font-semibold text-ink-muted">{label}</legend>
      {children}
    </fieldset>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-12 w-full md:h-full md:min-h-14 md:w-auto md:px-8"
    >
      {pending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <SearchIcon aria-hidden="true" />}
      {pending ? "Hesaplanıyor…" : "Ara"}
    </Button>
  );
}
