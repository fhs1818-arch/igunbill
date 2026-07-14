import type { HTMLAttributes, ReactNode } from "react";

type AppCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AppCard({ children, className = "", ...props }: AppCardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200/80 bg-white p-3 shadow-none transition duration-150 active:scale-[0.98] md:p-4 md:hover:border-slate-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
