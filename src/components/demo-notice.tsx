import { InfoIcon } from "lucide-react";
import { cn } from "cn";

/** Required next to demo prices: users must never mistake simulated offers for real ones. */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-3 rounded-lg bg-primary-soft px-4 py-3 text-sm text-ink", className)}>
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden="true" />
      <span>
        <span className="font-semibold">Demo verisi.</span> Tesisler hayali, fiyatlar ve müsaitlik simülasyondur.
        Gerçek bir teklif ya da rezervasyon bağlantısı değildir.
      </span>
    </p>
  );
}
