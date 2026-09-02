import * as React from "react";

type Variant = "primary" | "ghost" | "soft";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-white text-black border-white hover:bg-zinc-200 font-extrabold",
  ghost: "bg-transparent text-zinc-50 border-zinc-800 hover:bg-zinc-900",
  soft: "bg-zinc-900 text-zinc-50 border-zinc-800 hover:bg-zinc-800",
};

export function Button({ variant = "ghost", className = "", children, ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition min-h-[36px] min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
