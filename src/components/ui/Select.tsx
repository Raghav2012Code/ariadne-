import * as React from "react";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...props }: Props) {
  return (
    <select
      className={`bg-black text-zinc-50 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-zinc-600 min-w-[124px] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
