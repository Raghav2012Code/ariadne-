"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import { Toolbar } from "@/components/controls/Toolbar";
import { GridCanvas } from "@/components/grid/GridCanvas";
import { MetricsRibbon } from "@/components/metrics/MetricsRibbon";
import { parseUrlState } from "@/lib/utils/urlState";

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
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-black">
      <Toolbar />
      <div id="legend" className="shrink-0 flex gap-2 items-center flex-wrap px-3 py-1.5 bg-zinc-950 border-b border-zinc-800 text-[11px] font-semibold text-zinc-500 overflow-x-auto">
        <span className="inline-flex items-center gap-1.5 text-zinc-50"><i className="w-3 h-3 rounded-[3px] bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.45)] block" />Start</span>
        <span className="inline-flex items-center gap-1.5 text-zinc-50"><i className="w-3 h-3 rounded-[3px] bg-rose-500 shadow-[0_0_0_3px_rgba(239,68,68,0.45)] block" />Target</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] bg-black border border-zinc-900 block" />Unvisited</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] bg-indigo-600 block" />Visited</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] border border-zinc-400 block" />Frontier</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.65)] block" />Path</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] bg-zinc-800 block" />Wall</span>
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] bg-[#451a03] border border-[#7c2d12] block" />Weight</span>
      </div>
      <GridCanvas key={`${grid.length}-${grid[0]?.length ?? 0}`} />
      <MetricsRibbon />
    </div>
  );
}
