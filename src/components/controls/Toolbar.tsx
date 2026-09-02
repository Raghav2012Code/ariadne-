"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DifficultyPicker } from "./DifficultyPicker";
import { SpeedControl } from "./SpeedControl";
import type { AlgorithmType, SpeedType } from "@/store/types";
import { ChevronDown } from "lucide-react";

export function Toolbar() {
  const selectedAlgorithm = useGridStore((s) => s.selectedAlgorithm);
  const setAlgorithm = useGridStore((s) => s.setAlgorithm);
  const status = useGridStore((s) => s.status);
  const generateMaze = useGridStore((s) => s.generateMaze);
  const runSearch = useGridStore((s) => s.runSearch);
  const abort = useGridStore((s) => s.abort);
  const clearPath = useGridStore((s) => s.clearPath);
  const clearWalls = useGridStore((s) => s.clearWalls);
  const fullReset = useGridStore((s) => s.fullReset);
  const isEuclidean = useGridStore((s) => s.isEuclidean);
  const setEuclidean = useGridStore((s) => s.setEuclidean);
  const speed = useGridStore((s) => s.speed);
  const setSpeed = useGridStore((s) => s.setSpeed);
  const [clearOpen, setClearOpen] = React.useState(false);
  const isSearching = status === "SEARCHING";
  const isGenerating = status === "GENERATING";

  return (
    <header id="nav" className="shrink-0 bg-zinc-950 border-b border-zinc-800 flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white grid place-items-center">
              <div className="w-3 h-3 border border-black rotate-45 grid place-items-center">
                <div className="w-1 h-1 bg-black rounded-full" />
              </div>
            </div>
            <span className="font-extrabold tracking-[0.14em] text-sm">ARIADNE</span>
          </div>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <label className="flex flex-col gap-0.5">
            <span className="text-[8px] font-extrabold tracking-[0.12em] uppercase text-zinc-500">Algorithm</span>
            <Select value={selectedAlgorithm} onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)} disabled={isSearching || isGenerating}>
              <option value="astar">A* Search</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="bfs">BFS</option>
              <option value="dfs">DFS</option>
              <option value="greedy">Greedy Best-First</option>
              <option value="bibfs">Bidirectional BFS</option>
              <option value="biastar">Bidirectional A*</option>
            </Select>
          </label>
          <label className="flex items-center gap-1.5 ml-2 cursor-pointer">
            <input type="checkbox" checked={isEuclidean} onChange={(e) => setEuclidean(e.target.checked)} className="accent-white w-3.5 h-3.5" />
            <span className="text-[10px] font-bold text-zinc-400">Euclidean</span>
          </label>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="primary" onClick={() => (isSearching ? abort() : runSearch())} className={isSearching ? "animate-pulse" : ""}>
            {isSearching ? "Abort" : "Visualize"}
          </Button>
          <Button variant="ghost" onClick={() => generateMaze()} disabled={isSearching || isGenerating}>New Maze</Button>
          <div className="relative">
            <Button
              variant="ghost"
              aria-expanded={clearOpen}
              aria-haspopup="menu"
              onClick={() => setClearOpen((v) => !v)}
              disabled={isSearching || isGenerating}
            >
              Clear <ChevronDown size={12} />
            </Button>
            {clearOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] bg-zinc-950 border border-zinc-800 rounded-xl p-1 min-w-[150px] z-40 shadow-xl">
                <button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-900" onClick={() => { clearPath(); setClearOpen(false); }}>Clear Path</button>
                <button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-900" onClick={() => { clearWalls(); setClearOpen(false); }}>Clear Walls</button>
                <button className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-900" onClick={() => { fullReset(); setClearOpen(false); }}>Full Reset</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 px-3 py-2 flex-wrap overflow-x-auto">
        <DifficultyPicker />
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-zinc-500">Density</span>
          <DensityControl />
        </div>
        <SpeedControl />
        <span className="text-[10px] text-zinc-500 ml-auto hidden lg:inline">Drag anchors • Left wall • Right/Shift erase</span>
      </div>
    </header>
  );
}

function DensityControl() {
  const densityKey = useGridStore((s) => s.densityKey);
  const setDensity = useGridStore((s) => s.setDensity);
  const status = useGridStore((s) => s.status);
  const disabled = status === "SEARCHING" || status === "GENERATING";
  const opts = [
    { k: "spacious", l: "Spacious" },
    { k: "balanced", l: "Balanced" },
    { k: "dense", l: "Dense" },
  ] as const;
  return (
    <div className="flex bg-black border border-zinc-800 rounded-full p-0.5 gap-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          disabled={disabled}
          onClick={() => setDensity(o.k)}
          className={`px-2.5 py-1 rounded-full text-xs font-bold min-h-[28px] min-w-[44px] transition ${densityKey === o.k ? "bg-white text-black" : "bg-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"} disabled:opacity-50`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
