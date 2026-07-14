import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
};

type ActionLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
  variant?: Variant;
};

const variantClass = {
  primary: "border-brand bg-brand text-white hover:bg-blue-700",
  secondary: "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
  danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  ghost: "border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
};

const baseClass =
  "inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60";

export function ActionButton({ children, className = "", variant = "secondary", ...props }: ActionButtonProps) {
  return (
    <button className={`${baseClass} ${variantClass[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ActionLink({ children, className = "", href, variant = "secondary" }: ActionLinkProps) {
  return (
    <Link className={`${baseClass} ${variantClass[variant]} ${className}`} href={href}>
      {children}
    </Link>
  );
}
