"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import { Activity, Route, Timer, Cpu, Layers } from "lucide-react";

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 min-w-[118px]">
      <span className="grid place-items-center w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] text-zinc-300">
        {icon}
      </span>
      <span className="leading-none">
        <span className="block text-[9px] font-bold tracking-[0.14em] uppercase text-zinc-500">{label}</span>
        <span className={`block text-[14px] font-bold tabular-nums mt-0.5 ${accent ?? "text-zinc-50"}`}>{value}</span>
      </span>
    </div>
  );
}

export function MetricsRibbon() {
  const algo = useGridStore((s) => s.selectedAlgorithm);
  const difficulty = useGridStore((s) => s.selectedDifficulty);
  const status = useGridStore((s) => s.status);
  const visited = useGridStore((s) => s.nodesVisitedCount);
  const pathLen = useGridStore((s) => s.pathLength);
  const latency = useGridStore((s) => s.executionTimeMs);

  const statusColor =
    status === "FOUND"
      ? "text-emerald-300"
      : status === "SEARCHING" || status === "GENERATING"
        ? "text-cyan-300"
        : status === "UNREACHABLE"
          ? "text-rose-300"
          : "text-zinc-300";

  return (
    <footer
      id="ribbon"
      className="shrink-0 z-20 border-t border-white/[0.07] bg-[#0A0C10]/90 backdrop-blur-xl px-4 lg:px-6 py-2.5"
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        <Stat icon={<Cpu size={14} />} label="Algorithm" value={algo.toUpperCase().replace("ASTAR", "A*")} />
        <Stat icon={<Layers size={14} />} label="Maze" value={difficulty.toUpperCase()} />
        <Stat
          icon={<Activity size={14} />}
          label="Status"
          value={status}
          accent={`${statusColor} ${status === "SEARCHING" || status === "GENERATING" ? "animate-pulse" : ""}`}
        />
        <Stat icon={<Route size={14} />} label="Visited / Path" value={`${visited} / ${pathLen}`} accent="text-amber-200" />
        <Stat icon={<Timer size={14} />} label="Latency" value={`${latency.toFixed(1)}ms`} />
        <span className="ml-auto hidden md:block font-mono text-[11px] text-zinc-600">
          ariadne · {visited > 0 ? "run complete" : "ready"} · {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
