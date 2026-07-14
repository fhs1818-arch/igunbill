type MoneyTextProps = {
  amount: number | null | undefined;
  className?: string;
  tone?: "default" | "positive" | "negative" | "muted";
  unitClassName?: string;
};

const toneClass = {
  default: "text-ink",
  positive: "text-emerald-700",
  negative: "text-red-700",
  muted: "text-slate-500"
};

export function MoneyText({ amount, className = "", tone = "default", unitClassName = "" }: MoneyTextProps) {
  const formatted = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(amount ?? 0);

  return (
    <span className={`inline-flex items-baseline whitespace-nowrap tabular-nums ${toneClass[tone]} ${className}`}>
      <span className="font-extrabold">{formatted}</span>
      <span className={`ml-0.5 text-[0.72em] font-semibold ${unitClassName}`}>만원</span>
    </span>
  );
}
