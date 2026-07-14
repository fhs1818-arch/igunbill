import type { HTMLAttributes, ReactNode } from "react";

type AppCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AppCard({ children, className = "", ...props }: AppCardProps) {
  return (
    <div
      className={`rounded-lg border border-line bg-white p-4 shadow-sm shadow-slate-200/40 md:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
