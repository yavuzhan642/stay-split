import { Badge } from "@/components/ui/badge";
import type { Savings, StayPlan } from "@/domain/search";
import { formatMoney, formatPercent } from "@/lib/format";

export function switchLabel(plan: StayPlan): string {
  return plan.switchCount === 0 ? "Tek otel" : `${plan.switchCount} otel değişikliği`;
}

/** Green "₺1.800 tasarruf · %40" when cheaper than the best single stay, a quiet "₺200 daha pahalı" otherwise. */
export function SavingsBadge({ savings }: { savings: Savings | null }) {
  if (!savings || savings.amount.amount === 0) return null;
  if (savings.amount.amount > 0) {
    return (
      <Badge variant="savings">
        {formatMoney(savings.amount)} tasarruf · {formatPercent(savings.percent)}
      </Badge>
    );
  }
  return (
    <Badge variant="muted">
      {formatMoney({ ...savings.amount, amount: -savings.amount.amount })} daha pahalı
    </Badge>
  );
}

/** A plan's total, with the lodging/transfer split spelled out when there is a transfer cost. */
export function PlanTotal({ plan, align = "right" }: { plan: StayPlan; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <p className="text-xl font-bold tabular-nums">{formatMoney(plan.totalCost)}</p>
      <p className="text-xs text-ink-muted">
        {plan.transferCost.amount > 0
          ? `${formatMoney(plan.lodgingCost)} konaklama + ${formatMoney(plan.transferCost)} transfer`
          : "toplam, vergiler dahil"}
      </p>
    </div>
  );
}
