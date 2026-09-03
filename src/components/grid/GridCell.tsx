"use client";
import * as React from "react";
import type { CellNode } from "@/store/types";

type Props = { node: CellNode };

function baseClasses(n: CellNode): string {
  let cls =
    "node-cell w-[var(--cell-size)] h-[var(--cell-size)] grid place-items-center border touch-none select-none";
  if (n.type === "wall")
    cls +=
      " is-wall-anim bg-gradient-to-br from-[#3d4457] via-[#232936] to-[#12151d] border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,.14),inset_0_-1px_0_rgba(0,0,0,.5)]";
  else if (n.type === "weight")
    cls +=
      " bg-gradient-to-br from-[#3a2008] to-[#1c0e02] border-[#f59e0b]/40 shadow-[inset_0_0_8px_rgba(251,146,60,.35)]";
  else if (n.type === "start")
    cls +=
      " is-start bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-700 border-white shadow-[0_0_0_1.5px_rgba(255,255,255,.95),0_0_16px_rgba(52,211,153,.85)] z-[2]";
  else if (n.type === "target")
    cls +=
      " is-target bg-gradient-to-br from-rose-300 via-rose-500 to-rose-700 border-white shadow-[0_0_0_1.5px_rgba(255,255,255,.95),0_0_16px_rgba(251,113,133,.85)] z-[2]";
  else cls += " bg-[#0B0D12] border-white/[0.045]";
  return cls;
}

export const GridCell = React.memo(
  function GridCell({ node }: Props) {
    const isAnchor = node.type === "start" || node.type === "target";
    return (
      <div
        data-node={`${node.r}-${node.c}`}
        data-r={node.r}
        data-c={node.c}
        role="gridcell"
        className={baseClasses(node)}
        style={{ width: "var(--cell-size)", height: "var(--cell-size)" } as React.CSSProperties}
      >
        {isAnchor ? <span className="ariadne-beacon" aria-hidden /> : null}
        {node.type === "start" ? (
          <span className="font-black text-white leading-none select-none drop-shadow-[0_1px_3px_rgba(0,0,0,.7)] relative z-[1]" style={{ fontSize: "max(7px, calc(var(--cell-size) * 0.52))" }}>
            S
          </span>
        ) : null}
        {node.type === "target" ? (
          <span className="font-black text-white leading-none select-none drop-shadow-[0_1px_3px_rgba(0,0,0,.7)] relative z-[1]" style={{ fontSize: "max(7px, calc(var(--cell-size) * 0.52))" }}>
            T
          </span>
        ) : null}
        {node.type === "weight" ? (
          <span className="rounded-full bg-gradient-to-br from-amber-200 to-orange-500 select-none animate-weight-spin" style={{ width: "max(3px, calc(var(--cell-size) * 0.3))", height: "max(3px, calc(var(--cell-size) * 0.3))", boxShadow: "0 0 8px rgba(251,146,60,.9)" }} />
        ) : null}
      </div>
    );
  },
  (prev, next) => prev.node.type === next.node.type && prev.node.r === next.node.r && prev.node.c === next.node.c
);
