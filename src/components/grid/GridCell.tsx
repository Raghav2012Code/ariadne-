"use client";
import * as React from "react";
import type { CellNode } from "@/store/types";

type Props = { node: CellNode };

function baseClasses(n: CellNode): string {
  let cls =
    "node-cell w-[var(--cell-size)] h-[var(--cell-size)] grid place-items-center border touch-none select-none";
  if (n.type === "wall")
    cls +=
      " bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]";
  else if (n.type === "weight")
    cls += " bg-[#2a1503] border-[#7c2d12]/70 shadow-[inset_0_0_6px_rgba(251,146,60,.25)]";
  else if (n.type === "start")
    cls +=
      " is-start bg-gradient-to-br from-emerald-400 to-emerald-600 border-white shadow-[0_0_0_1.5px_rgba(255,255,255,.9),0_0_14px_rgba(52,211,153,.7)] z-[2]";
  else if (n.type === "target")
    cls +=
      " is-target bg-gradient-to-br from-rose-400 to-rose-600 border-white shadow-[0_0_0_1.5px_rgba(255,255,255,.9),0_0_14px_rgba(251,113,133,.7)] z-[2]";
  else cls += " bg-[#0B0D12] border-white/[0.045]";
  return cls;
}

export const GridCell = React.memo(
  function GridCell({ node }: Props) {
    return (
      <div
        data-node={`${node.r}-${node.c}`}
        data-r={node.r}
        data-c={node.c}
        role="gridcell"
        className={baseClasses(node)}
        style={{ width: "var(--cell-size)", height: "var(--cell-size)" } as React.CSSProperties}
      >
        {node.type === "start" ? (
          <span className="font-black text-white leading-none select-none drop-shadow" style={{ fontSize: "max(7px, calc(var(--cell-size) * 0.52))" }}>
            S
          </span>
        ) : null}
        {node.type === "target" ? (
          <span className="font-black text-white leading-none select-none drop-shadow" style={{ fontSize: "max(7px, calc(var(--cell-size) * 0.52))" }}>
            T
          </span>
        ) : null}
        {node.type === "weight" ? (
          <span className="rounded-full bg-orange-400/90 select-none" style={{ width: "max(3px, calc(var(--cell-size) * 0.28))", height: "max(3px, calc(var(--cell-size) * 0.28))", boxShadow: "0 0 6px rgba(251,146,60,.8)" }} />
        ) : null}
      </div>
    );
  },
  (prev, next) => prev.node.type === next.node.type && prev.node.r === next.node.r && prev.node.c === next.node.c
);
