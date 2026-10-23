"use client";

import { Loader2Icon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import Form from "next/form";
import { useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
  /** "hero" shows every field; "compact" tucks the filters away, for the results page. */
  readonly variant?: "hero" | "compact";
}

/**
 * A plain GET form to /search: it works without JavaScript, and `next/form`
 * upgrades it to a client-side navigation when JavaScript is available.
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
  const filtersHaveErrors = Boolean(errors.propertyTypes || errors.maxSwitches || errors.budget || errors.includeTransferCost);
  const compact = variant === "compact";

  const mainFields = (
    <>
      <Field data-invalid={Boolean(errors.cityId)}>
        <FieldLabel htmlFor="search-city">Şehir</FieldLabel>
        <NativeSelect
          id="search-city"
          name={SEARCH_PARAM.cityId}
          value={city}
          onChange={(event) => setCity(event.target.value)}
          size="lg"
          className="w-full"
          aria-invalid={Boolean(errors.cityId)}
        >
          {CITIES.map((option) => (
            <NativeSelectOption key={option.id} value={option.id}>
              {option.name}, {option.country}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError>{errors.cityId}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.checkIn)}>
        <FieldLabel htmlFor="search-check-in">Giriş</FieldLabel>
        <Input
          id="search-check-in"
          type="date"
          name={SEARCH_PARAM.checkIn}
          value={checkInValue}
          onChange={(event) => changeCheckIn(event.target.value)}
          min={today ?? undefined}
          max={today ? addDays(today, SEARCH_LIMITS.maxDaysAhead) : undefined}
          required
          className="h-11 bg-card"
          aria-invalid={Boolean(errors.checkIn)}
        />
        <FieldError>{errors.checkIn}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.checkOut)}>
        <FieldLabel htmlFor="search-check-out">Çıkış</FieldLabel>
        <Input
          id="search-check-out"
          type="date"
          name={SEARCH_PARAM.checkOut}
          value={checkOutValue}
          onChange={(event) => setCheckOut(event.target.value)}
          min={isIsoDate(checkInValue) ? addDays(checkInValue, 1) : undefined}
          max={isIsoDate(checkInValue) ? addDays(checkInValue, SEARCH_LIMITS.maxNights) : undefined}
          required
          className="h-11 bg-card"
          aria-invalid={Boolean(errors.checkOut)}
        />
        <FieldError>{errors.checkOut}</FieldError>
      </Field>

      <Field data-invalid={Boolean(errors.adults)}>
        <FieldLabel htmlFor="search-adults">Yetişkin</FieldLabel>
        <NativeSelect
          id="search-adults"
          name={SEARCH_PARAM.adults}
          defaultValue={defaults.adults ?? "2"}
          size="lg"
          className="w-full"
          aria-invalid={Boolean(errors.adults)}
        >
          {Array.from({ length: SEARCH_LIMITS.maxAdults }, (_, i) => String(i + 1)).map((count) => (
            <NativeSelectOption key={count} value={count}>
              {count} yetişkin
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError>{errors.adults}</FieldError>
      </Field>
    </>
  );

  const filterFields = (
    <div className="grid gap-4 pt-1 md:grid-cols-2 lg:grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
      <FieldSet data-invalid={Boolean(errors.propertyTypes)}>
        <FieldLegend variant="label">Konaklama türü</FieldLegend>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <label
              key={type}
              className="inline-flex h-11 cursor-pointer items-center rounded-full border border-input bg-card px-4 text-sm font-medium transition-colors select-none hover:bg-muted has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
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
        </div>
        <FieldDescription className="text-xs">Hiçbirini seçmezsen tüm türler aranır.</FieldDescription>
        <FieldError>{errors.propertyTypes}</FieldError>
      </FieldSet>

      <FieldSet data-invalid={Boolean(errors.maxSwitches)}>
        <FieldLegend variant="label">Otel değişikliği</FieldLegend>
        <div className="grid h-11 grid-cols-2 gap-1 rounded-lg border border-input bg-muted p-1">
          {[
            { value: "0", label: "Tek otel" },
            { value: "1", label: "En fazla 1" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors select-none has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
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
        <FieldError>{errors.maxSwitches}</FieldError>
      </FieldSet>

      <Field data-invalid={Boolean(errors.budget)}>
        <FieldLabel htmlFor="search-budget">Toplam bütçe</FieldLabel>
        <div className="relative">
          <Input
            id="search-budget"
            type="number"
            inputMode="numeric"
            name={SEARCH_PARAM.budget}
            defaultValue={defaults.budget}
            min={1}
            step="any"
            placeholder="Sınırsız"
            className="h-11 bg-card pr-10"
            aria-invalid={Boolean(errors.budget)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
            TL
          </span>
        </div>
        <FieldError>{errors.budget}</FieldError>
      </Field>

      <Field>
        <span className="text-sm font-medium" aria-hidden="true">
          Transfer
        </span>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-input bg-card px-3 py-2 transition-colors has-checked:border-primary/40 has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
          <input
            type="checkbox"
            name={SEARCH_PARAM.includeTransferCost}
            value="1"
            defaultChecked={defaults.transfer}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-5 w-9 shrink-0 rounded-full bg-input transition-colors peer-checked:bg-primary after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
          />
          <span className="text-sm leading-tight">
            Tahmini transfer maliyetini ekle
            <span className="block text-xs text-muted-foreground">Oteller arası taksi, mesafeye göre</span>
          </span>
        </label>
      </Field>
    </div>
  );

  return (
    <Form action="/search" className="flex flex-col gap-4">
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          compact
            ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-start"
            : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]",
        )}
      >
        {mainFields}
        {compact && (
          // Top-aligned like the fields, so an error message under a field never shifts the row.
          <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <span aria-hidden="true" className="hidden text-sm leading-snug lg:block">
              &nbsp;
            </span>
            <SubmitButton />
          </div>
        )}
      </div>

      {compact ? (
        <details open={filtersHaveErrors} className="group rounded-lg">
          <summary className="inline-flex cursor-pointer items-center gap-2 rounded-md text-sm font-medium text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
            <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
            Filtreler
            {activeFilters > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground">{activeFilters}</span>
            )}
          </summary>
          <div className="pt-3">{filterFields}</div>
        </details>
      ) : (
        <>
          {filterFields}
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Her olası bölünme tarihini ve otel çiftini hesaplıyoruz. Fiyatlar demo verisidir.
            </p>
            <SubmitButton />
          </div>
        </>
      )}
    </Form>
  );
}

function SubmitButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className={cn("h-11 px-6 text-base", className)}>
      {pending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <SearchIcon aria-hidden="true" />}
      {pending ? "Hesaplanıyor…" : "Kombinasyonları bul"}
    </Button>
  );
}
