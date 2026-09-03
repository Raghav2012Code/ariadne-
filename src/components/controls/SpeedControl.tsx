"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import type { SpeedType } from "@/store/types";
import { Zap } from "lucide-react";

const order: SpeedType[] = ["instant", "fast", "normal", "slow"];
const labels: Record<SpeedType, string> = { instant: "Instant", fast: "Fast", normal: "Normal", slow: "Slow" };

export function SpeedControl() {
  const speed = useGridStore((s) => s.speed);
  const setSpeed = useGridStore((s) => s.setSpeed);
  const idx = order.indexOf(speed);
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/60 pl-3 pr-3 py-1.5">
      <span className="inline-flex items-center gap-1 label-micro">
        <Zap size={12} className="text-amber-300/80" /> Speed
      </span>
      <input
        type="range"
        min={0}
        max={3}
        value={idx}
        onChange={(e) => setSpeed(order[parseInt(e.target.value, 10)])}
        className="slider-modern w-[96px]"
        aria-label="Animation speed"
      />
      <span className="text-[12px] font-semibold text-zinc-100 min-w-[52px] text-right tabular-nums">{labels[speed]}</span>
    </div>
  );
}
