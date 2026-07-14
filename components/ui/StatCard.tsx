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
    <AppCard className={`flex min-h-[86px] flex-col justify-center ${className}`}>
      <p className={`text-[1.7rem] font-bold leading-tight ${toneClass[tone]}`}>{value}</p>
      <p className="mt-1 text-xs font-normal text-slate-500">{label}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}
    </AppCard>
  );
}
