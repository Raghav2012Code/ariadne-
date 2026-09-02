"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";

export function MetricsRibbon() {
  const algo = useGridStore((s) => s.selectedAlgorithm);
  const difficulty = useGridStore((s) => s.selectedDifficulty);
  const status = useGridStore((s) => s.status);
  const visited = useGridStore((s) => s.nodesVisitedCount);
  const pathLen = useGridStore((s) => s.pathLength);
  const latency = useGridStore((s) => s.executionTimeMs);
  return (
    <footer id="ribbon" className="shrink-0 h-7 flex items-center justify-center bg-zinc-950 border-t border-zinc-800 font-mono text-[11px] font-semibold tracking-[0.04em] text-zinc-500 px-2">
      <div className="flex gap-2 items-center flex-wrap justify-center">
        <span>ALGO: <b className="text-zinc-50 font-extrabold">{algo.toUpperCase().replace("ASTAR","A*")}</b></span><span className="text-zinc-700">•</span>
        <span>DIFFICULTY: <b className="text-zinc-50 font-extrabold">{difficulty.toUpperCase()}</b></span><span className="text-zinc-700">•</span>
        <span>STATUS: <b className="text-zinc-50 font-extrabold">{status}</b></span><span className="text-zinc-700">•</span>
        <span>VISITED: <b className="text-zinc-50 font-extrabold">{visited}</b></span><span className="text-zinc-700">•</span>
        <span>PATH: <b className="text-zinc-50 font-extrabold">{pathLen}</b></span><span className="text-zinc-700">•</span>
        <span>LATENCY: <b className="text-zinc-50 font-extrabold">{latency.toFixed(1)}ms</b></span>
      </div>
    </footer>
  );
}
