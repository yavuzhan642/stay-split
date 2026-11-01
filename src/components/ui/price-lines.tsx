import type { ReactNode } from "react";
import { cn } from "cn";

/** Label on the left, amount on the right; a line above the total. */
export function PriceLines({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("grid gap-1.5 text-sm", className)}>{children}</dl>;
}

export function PriceLine({
  label,
  value,
  tone = "default",
  strike = false,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "total" | "muted" | "saving";
  /** The struck-through reference price ("Tek otelde"). */
  strike?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        tone === "total" && "mt-1 border-t border-line pt-2 font-semibold",
        tone === "muted" && "text-ink-muted",
        tone === "saving" && "font-semibold text-savings",
      )}
    >
      <dt className={cn(tone === "default" && "text-ink-muted")}>{label}</dt>
      <dd className={cn("tabular-nums", strike && "line-through")}>{value}</dd>
    </div>
  );
}
