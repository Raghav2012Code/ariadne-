"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import { Toolbar } from "@/components/controls/Toolbar";
import { GridCanvas } from "@/components/grid/GridCanvas";
import { MetricsRibbon } from "@/components/metrics/MetricsRibbon";
import { parseUrlState } from "@/lib/utils/urlState";

const LEGEND = [
  { label: "Start", cls: "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(52,211,153,.6)] border-white/60" },
  { label: "Target", cls: "bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(251,113,133,.6)] border-white/60" },
  { label: "Unvisited", cls: "bg-[#0B0D12] border-white/15" },
  { label: "Visited", cls: "bg-gradient-to-br from-indigo-950 via-indigo-700 to-violet-500 border-transparent" },
  { label: "Frontier", cls: "bg-cyan-400/10 border-cyan-300/70 border-dashed" },
  { label: "Path", cls: "bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,.6)] border-white/70" },
  { label: "Wall", cls: "bg-gradient-to-br from-zinc-600 to-zinc-900 border-white/10" },
  { label: "Weight ×5", cls: "bg-[#2a1503] border-orange-500/50" },
];

export default function Page() {
  const initializeGrid = useGridStore((s) => s.initializeGrid);
  const generateMaze = useGridStore((s) => s.generateMaze);
  const hydrateFromUrl = useGridStore((s) => s.hydrateFromUrl);
  const grid = useGridStore((s) => s.grid);

  React.useEffect(() => {
    const qs = parseUrlState(window.location.search);
    if (qs.algo || qs.difficulty || qs.speed) {
      hydrateFromUrl(qs.algo, qs.difficulty, qs.speed);
    }
    initializeGrid();
    // Defer generation to next tick so grid is mounted
    const t = setTimeout(() => { generateMaze(); }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col">
      <Toolbar />
      <div
        id="legend"
        className="shrink-0 z-10 flex gap-2 items-center px-4 lg:px-6 py-2 border-b border-white/[0.06] bg-black/30 backdrop-blur overflow-x-auto"
      >
        <span className="label-micro mr-1 shrink-0">Legend</span>
        {LEGEND.map((it) => (
          <span
            key={it.label}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-300 shrink-0 rounded-full border border-white/[0.06] bg-white/[0.02] pl-1.5 pr-2.5 py-1"
          >
            <i className={`w-3.5 h-3.5 rounded-[5px] border block ${it.cls}`} />
            {it.label}
          </span>
        ))}
        <span className="ml-auto hidden xl:block text-[11px] text-zinc-600 shrink-0 font-medium">
          Weighted cells cost 5 · Walls block movement
        </span>
      </div>
      <GridCanvas key={`${grid.length}-${grid[0]?.length ?? 0}`} />
      <MetricsRibbon />
    </div>
  );
}
