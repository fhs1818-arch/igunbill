import type { ReactNode } from "react";
import { AppCard } from "@/components/ui/AppCard";

type StatCardProps = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning" | "brand";
  className?: string;
};

const toneClass = {
  default: "text-ink",
  positive: "text-emerald-700",
  negative: "text-red-700",
  warning: "text-amber-700",
  brand: "text-brand"
};

export function StatCard({ label, value, description, tone = "default", className = "" }: StatCardProps) {
  return (
    <AppCard className={className}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass[tone]}`}>{value}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
    </AppCard>
  );
}
