import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet";

const styles: Record<Variant, string> = {
  primary: "bg-coral-deep text-white shadow-md shadow-coral-deep/20 hover:brightness-110",
  secondary: "bg-surface text-ink border-2 border-line hover:border-coral",
  quiet: "bg-transparent text-ink underline underline-offset-4 decoration-coral hover:decoration-2",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}
