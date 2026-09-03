import * as React from "react";

type Variant = "primary" | "ghost" | "soft" | "danger";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-white text-zinc-950 border-white hover:bg-zinc-200 font-bold shadow-[0_2px_10px_rgba(0,0,0,.4)]",
  ghost:
    "bg-white/[0.04] text-zinc-100 border-white/10 hover:bg-white/[0.08] hover:border-white/20",
  soft: "bg-white/[0.06] text-zinc-200 border-white/10 hover:bg-white/[0.1]",
  danger:
    "bg-rose-500 text-white border-rose-500 hover:bg-rose-400 font-bold shadow-[0_2px_10px_rgba(0,0,0,.4)]",
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
