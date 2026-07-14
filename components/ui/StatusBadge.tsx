import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning" | "brand";
  className?: string;
};

const toneClass = {
  default: "border-slate-200 bg-slate-50 text-slate-700",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  negative: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  brand: "border-blue-200 bg-blue-50 text-brand"
};

export function StatusBadge({ children, tone = "default", className = "" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]} ${className}`}>
      {children}
    </span>
  );
}
