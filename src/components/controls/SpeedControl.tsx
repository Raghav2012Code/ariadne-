"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import type { SpeedType } from "@/store/types";

const order: SpeedType[] = ["instant", "fast", "normal", "slow"];
const labels: Record<SpeedType, string> = { instant: "Instant", fast: "Fast", normal: "Normal", slow: "Slow" };

export function SpeedControl() {
  const speed = useGridStore((s) => s.speed);
  const setSpeed = useGridStore((s) => s.setSpeed);
  const idx = order.indexOf(speed);
  return (
    <div className="flex items-center gap-1.5 bg-black border border-zinc-800 rounded-full px-2 py-1">
      <span className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-zinc-500">Speed</span>
      <input
        type="range"
        min={0}
        max={3}
        value={idx}
        onChange={(e) => setSpeed(order[parseInt(e.target.value, 10)])}
        className="w-[90px] h-1 accent-white cursor-pointer"
        aria-label="Speed"
      />
      <span className="text-xs font-bold text-white min-w-[48px]">{labels[speed]}</span>
    </div>
  );
}
