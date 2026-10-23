import { Badge } from "@/components/ui/badge";
import type { Savings, StayPlan } from "@/domain/search";
import { formatMoney, formatPercent } from "@/lib/format";

export function switchLabel(plan: StayPlan): string {
  return plan.switchCount === 0 ? "Tek otel" : `${plan.switchCount} otel değişikliği`;
}

/** Green "₺1.800 tasarruf · %40" when cheaper than the best single stay, muted "₺200 daha pahalı" otherwise. */
export function SavingsBadge({ savings }: { savings: Savings | null }) {
  if (!savings || savings.amount.amount === 0) return null;
  if (savings.amount.amount > 0) {
    return (
      <Badge variant="savings" className="h-6 px-2.5 text-xs">
        {formatMoney(savings.amount)} tasarruf · {formatPercent(savings.percent)}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-6 px-2.5 text-xs text-muted-foreground">
      {formatMoney({ ...savings.amount, amount: -savings.amount.amount })} daha pahalı
    </Badge>
  );
}

/** Total with the lodging/transfer split spelled out when there is a transfer cost. */
export function PlanTotal({
  plan,
  size = "md",
  align = "right",
}: {
  plan: StayPlan;
  size?: "md" | "lg";
  /** "responsive": left-aligned when stacked on phones, right-aligned from sm up. */
  align?: "right" | "responsive";
}) {
  return (
    <div className={align === "right" ? "text-right" : "sm:text-right"}>
      <p className={size === "lg" ? "text-3xl font-semibold tracking-tight tabular-nums" : "text-xl font-semibold tabular-nums"}>
        {formatMoney(plan.totalCost)}
      </p>
      <p className="text-xs text-muted-foreground">
        {plan.transferCost.amount > 0
          ? `${formatMoney(plan.lodgingCost)} konaklama + ${formatMoney(plan.transferCost)} transfer`
          : "toplam, vergiler dahil"}
      </p>
    </div>
  );
}
