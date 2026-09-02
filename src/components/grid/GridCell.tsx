"use client";
import * as React from "react";
import type { CellNode } from "@/store/types";

type Props = { node: CellNode };

function baseClasses(n: CellNode): string {
  let cls = "node-cell w-[var(--cell-size)] h-[var(--cell-size)] rounded-[1px] grid place-items-center border touch-none select-none";
  // Default unvisited
  if (n.type === "wall") cls += " bg-zinc-800 border-zinc-800";
  else if (n.type === "weight") cls += " bg-[#451a03] border-[#7c2d12]";
  else if (n.type === "start") cls += " is-start bg-emerald-500 border-white shadow-[0_0_0_2px_#fff,0_0_12px_rgba(34,197,94,0.45)] z-[2]";
  else if (n.type === "target") cls += " is-target bg-rose-500 border-white shadow-[0_0_0_2px_#fff,0_0_12px_rgba(239,68,68,0.45)] z-[2]";
  else cls += " bg-black border-zinc-900/60";
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
        {node.type === "start" ? <span className="text-[7px] font-black text-white leading-none select-none">S</span> : null}
        {node.type === "target" ? <span className="text-[7px] font-black text-white leading-none select-none">T</span> : null}
        {node.type === "weight" ? <span className="text-[6px] font-black text-amber-200 select-none">•</span> : null}
      </div>
    );
  },
  (prev, next) => prev.node.type === next.node.type && prev.node.r === next.node.r && prev.node.c === next.node.c
);
