import * as React from "react";

type Variant = "primary" | "ghost" | "soft";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "text-white border-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 hover:brightness-110 hover:shadow-glow shadow-[0_4px_20px_rgba(99,102,241,.4)] font-bold",
  ghost:
    "bg-white/[0.04] text-zinc-100 border-white/10 hover:bg-white/[0.08] hover:border-white/20",
  soft: "bg-white/[0.06] text-zinc-200 border-white/10 hover:bg-white/[0.1]",
};

export function Button({ variant = "ghost", className = "", children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-[13px] leading-none transition-all duration-150 min-h-[38px] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
