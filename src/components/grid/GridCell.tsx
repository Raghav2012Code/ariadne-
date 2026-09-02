"use client";
import * as React from "react";
import type { CellNode } from "@/store/types";

type Props = { node: CellNode };

function getClass(n: CellNode): string {
  const base = "w-[var(--cell-size)] h-[var(--cell-size)] rounded-[1px] grid place-items-center border border-transparent relative touch-none";
  let cls = base;
  if (n.type === "wall") cls += " bg-zinc-800 border-zinc-800";
  else if (n.type === "weight") cls += " bg-[#451a03] border-[#7c2d12]";
  else cls += " bg-black border-zinc-900/60";
  if (n.state === "visited") cls += " visited-anim";
  if (n.state === "frontier") cls += " border-zinc-400 !bg-zinc-900";
  if (n.state === "path") cls += " !bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.65)] z-[1] path-anim";
  if (n.type === "start") cls += " !bg-emerald-500 !border-white shadow-[0_0_0_2px_#fff,0_0_12px_rgba(34,197,94,0.45)] z-[2]";
  if (n.type === "target") cls += " !bg-rose-500 !border-white shadow-[0_0_0_2px_#fff,0_0_12px_rgba(239,68,68,0.45)] z-[2]";
  return cls;
}

export const GridCell = React.memo(function GridCell({ node }: Props) {
  return (
    <div
      data-cell={`${node.r}-${node.c}`}
      data-r={node.r}
      data-c={node.c}
      role="gridcell"
      className={getClass(node)}
      style={{ width: "var(--cell-size)", height: "var(--cell-size)" } as React.CSSProperties}
    >
      {node.type === "start" ? <span className="text-[7px] font-black text-white leading-none">S</span> : null}
      {node.type === "target" ? <span className="text-[7px] font-black text-white leading-none">T</span> : null}
      {node.type === "weight" && node.state === "unvisited" ? <span className="text-[6px] font-black text-amber-200">•</span> : null}
      <style jsx>{`
        .visited-anim { background: linear-gradient(135deg, #18182b, #312e81 55%, #4338ca); animation: visitedRipple 0.45s ease forwards; border-color: transparent; }
        .path-anim { animation: pathNeon 0.75s ease infinite alternate; }
      `}</style>
    </div>
  );
});
