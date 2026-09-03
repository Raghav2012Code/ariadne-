import * as React from "react";
import { ChevronDown } from "lucide-react";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...props }: Props) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <select
        {...props}
        className="appearance-none bg-white/[0.04] hover:bg-white/[0.07] text-zinc-100 border border-white/10 hover:border-white/20 rounded-xl pl-3 pr-8 py-2 text-[13px] font-medium outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20 transition min-w-[148px] cursor-pointer disabled:opacity-40"
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-zinc-500" />
    </span>
  );
}
