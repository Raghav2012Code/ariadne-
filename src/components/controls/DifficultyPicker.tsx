"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import type { DifficultyType } from "@/store/types";

const options: { value: DifficultyType; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function DifficultyPicker() {
  const selected = useGridStore((s) => s.selectedDifficulty);
  const setDifficulty = useGridStore((s) => s.setDifficulty);
  const status = useGridStore((s) => s.status);
  const disabled = status === "SEARCHING" || status === "GENERATING";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-zinc-500">Difficulty</span>
      <div className="flex bg-black border border-zinc-800 rounded-full p-0.5 gap-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            disabled={disabled}
            onClick={() => setDifficulty(o.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold min-h-[28px] min-w-[44px] transition ${selected === o.value ? "bg-white text-black" : "bg-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"} disabled:opacity-50`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
