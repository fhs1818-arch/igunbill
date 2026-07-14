import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="panel flex flex-col items-start justify-between gap-3 px-4 py-4 md:flex-row md:items-center md:px-8 md:py-6">
      <div>
        <h2 className="text-xl font-bold text-ink md:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="w-full shrink-0 md:w-auto">{actions}</div> : null}
    </header>
  );
}
