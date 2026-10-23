import { FlaskConicalIcon } from "lucide-react";
import { cn } from "cn";

/** Required next to demo prices: users must never mistake simulated offers for real ones. */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg border border-demo/30 bg-demo-soft px-3 py-2 text-sm text-demo",
        className,
      )}
    >
      <FlaskConicalIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">Demo verisi.</span> Tesisler hayali, fiyatlar ve müsaitlik simülasyondur. Gerçek
        bir teklif ya da rezervasyon bağlantısı değildir.
      </span>
    </p>
  );
}
