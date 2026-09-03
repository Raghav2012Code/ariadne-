"use client";
import * as React from "react";
import type { CellNode } from "@/store/types";

type Props = { node: CellNode };

function baseClasses(n: CellNode): string {
  let cls =
    "node-cell w-[var(--cell-size)] h-[var(--cell-size)] grid place-items-center border touch-none select-none";
  if (n.type === "wall")
    cls += " is-wall-anim bg-[#262b34] border-black/40";
  else if (n.type === "weight")
    cls += " bg-[#3a2208] border-[#7c2d12]/70";
  else if (n.type === "start")
    cls += " is-start bg-emerald-500 border-white z-[2]";
  else if (n.type === "target")
    cls += " is-target bg-rose-500 border-white z-[2]";
  else cls += " bg-[#0b0d12] border-white/[0.05]";
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
          <span className="font-bold text-white leading-none select-none relative z-[1]" style={{ fontSize: "max(7px, calc(var(--cell-size) * 0.52))" }}>
            S
          </span>
        ) : null}
        {node.type === "target" ? (
          <span className="font-bold text-white leading-none select-none relative z-[1]" style={{ fontSize: "max(7px, calc(var(--cell-size) * 0.52))" }}>
            T
          </span>
        ) : null}
        {node.type === "weight" ? (
          <span className="rounded-full bg-amber-400 select-none" style={{ width: "max(3px, calc(var(--cell-size) * 0.3))", height: "max(3px, calc(var(--cell-size) * 0.3))" }} />
        ) : null}
      </div>
    );
  },
  (prev, next) => prev.node.type === next.node.type && prev.node.r === next.node.r && prev.node.c === next.node.c
);
