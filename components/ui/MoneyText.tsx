type MoneyTextProps = {
  amount: number | null | undefined;
  className?: string;
  tone?: "default" | "positive" | "negative" | "muted";
};

const toneClass = {
  default: "text-ink",
  positive: "text-emerald-700",
  negative: "text-red-700",
  muted: "text-slate-500"
};

export function MoneyText({ amount, className = "", tone = "default" }: MoneyTextProps) {
  const formatted = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(amount ?? 0);

  return <span className={`font-bold tabular-nums ${toneClass[tone]} ${className}`}>{formatted}만원</span>;
}
