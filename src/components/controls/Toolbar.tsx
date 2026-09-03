"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DifficultyPicker } from "./DifficultyPicker";
import { SpeedControl } from "./SpeedControl";
import type { AlgorithmType } from "@/store/types";
import {
  ChevronDown,
  Play,
  Square,
  Shuffle,
  Eraser,
  Route,
  FlaskConical,
  LayoutGrid,
  MousePointer2,
} from "lucide-react";

const ALGOS: { value: AlgorithmType; label: string; tag: string }[] = [
  { value: "astar", label: "A* Search", tag: "Best overall" },
  { value: "dijkstra", label: "Dijkstra", tag: "Weighted optimal" },
  { value: "bfs", label: "BFS", tag: "Unweighted optimal" },
  { value: "dfs", label: "DFS", tag: "Deep explorer" },
  { value: "greedy", label: "Greedy Best-First", tag: "Fast & loose" },
  { value: "bibfs", label: "Bidirectional BFS", tag: "Meet in middle" },
  { value: "biastar", label: "Bidirectional A*", tag: "Fast optimal" },
];

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
  const [clearOpen, setClearOpen] = React.useState(false);
  const isSearching = status === "SEARCHING";
  const isGenerating = status === "GENERATING";
  const busy = isSearching || isGenerating;
  const clearRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!clearRef.current?.contains(e.target as Node)) setClearOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header id="nav" className="shrink-0 z-30 border-b border-white/[0.07] bg-[#0A0C10]">
      {/* Top row — brand + primary actions */}
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 flex-wrap">
        <div className="flex items-center gap-3 mr-1">
          <div className="relative grid place-items-center w-9 h-9 rounded-md bg-indigo-500">
            <Route size={18} className="text-white" strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-[0.12em] text-[14px]">ARIADNE</span>
              <span className="hidden sm:inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 tracking-wide">
                MAZE LAB
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mt-1 hidden md:block">
              Generate mazes · Visualize search · Compare algorithms
            </p>
          </div>
        </div>

        <div className="hidden xl:block w-px h-9 bg-white/10 mx-1" />

        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="label-micro inline-flex items-center gap-1">
              <FlaskConical size={11} /> Algorithm
            </span>
            <Select
              value={selectedAlgorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
              disabled={busy}
              title={ALGOS.find((a) => a.value === selectedAlgorithm)?.tag}
            >
              {ALGOS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </label>

          <div
            role="switch"
            aria-checked={isEuclidean}
            tabIndex={busy ? -1 : 0}
            onClick={() => {
              if (!busy) setEuclidean(!isEuclidean);
            }}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !busy) {
                e.preventDefault();
                setEuclidean(!isEuclidean);
              }
            }}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition select-none min-h-[38px] mt-[18px] ${
              isEuclidean
                ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-200"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            }`}
            title="Use Euclidean distance for A* / Greedy"
          >
            <span
              aria-hidden
              className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${isEuclidean ? "bg-indigo-400" : "bg-zinc-700"}`}
            >
              <span
                className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${isEuclidean ? "left-[16px]" : "left-[2px]"}`}
              />
            </span>
            <span className="text-[12px] font-semibold">Euclidean</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Button
            variant={isSearching ? "danger" : "primary"}
            onClick={() => (isSearching ? abort() : runSearch())}
            className="min-w-[132px]"
          >
            {isSearching ? (
              <>
                <Square size={14} fill="currentColor" /> Abort
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" /> Visualize
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => generateMaze()} disabled={busy}>
            <Shuffle size={14} className="text-cyan-300" /> New Maze
          </Button>
          <div className="relative" ref={clearRef}>
            <Button
              variant="ghost"
              aria-expanded={clearOpen}
              aria-haspopup="menu"
              onClick={() => setClearOpen((v) => !v)}
              disabled={busy}
            >
              <Eraser size={14} className="text-zinc-400" /> Clear <ChevronDown size={13} className={`transition-transform ${clearOpen ? "rotate-180" : ""}`} />
            </Button>
            {clearOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] rounded-lg border border-white/10 bg-[#101319] p-1.5 min-w-[180px] z-50">
                {[
                  { label: "Clear path", desc: "Keep walls", fn: clearPath },
                  { label: "Clear walls", desc: "Keep anchors", fn: clearWalls },
                  { label: "Full reset", desc: "Fresh grid", fn: fullReset },
                ].map((it) => (
                  <button
                    key={it.label}
                    className="w-full text-left px-3 py-2 rounded-md text-[13px] font-semibold hover:bg-white/[0.06] transition group"
                    onClick={() => {
                      it.fn();
                      setClearOpen(false);
                    }}
                  >
                    <span className="block text-zinc-100">{it.label}</span>
                    <span className="block text-[11px] text-zinc-500 font-medium">{it.desc}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom row — tuning */}
      <div className="flex items-center gap-x-4 gap-y-2 px-4 lg:px-6 py-2.5 border-t border-white/[0.06] bg-black/20 flex-wrap overflow-x-auto">
        <DifficultyPicker />
        <div className="flex items-center gap-2">
          <span className="label-micro hidden sm:inline-flex items-center gap-1">
            <LayoutGrid size={12} className="text-zinc-500" /> Density
          </span>
          <DensityControl />
        </div>
        <SpeedControl />
        <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-zinc-500 ml-auto font-medium">
          <MousePointer2 size={12} /> Drag <b className="text-emerald-300">S</b>/<b className="text-rose-300">T</b> anchors · Left-draw walls · Right/Shift erases · Space to run
        </span>
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
    <div className="seg-shell">
      {opts.map((o) => (
        <button
          key={o.k}
          disabled={disabled}
          onClick={() => setDensity(o.k)}
          className={`seg-btn ${densityKey === o.k ? "seg-btn-active" : ""}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
