export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-500">
      {label}
      {children}
    </label>
  );
}
