"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import type { DifficultyType } from "@/store/types";
import { Gauge } from "lucide-react";

const options: { value: DifficultyType; label: string; hint: string }[] = [
  { value: "easy", label: "Easy", hint: "Open caverns" },
  { value: "medium", label: "Medium", hint: "Balanced maze" },
  { value: "hard", label: "Hard", hint: "Dense braids" },
];

export function DifficultyPicker() {
  const selected = useGridStore((s) => s.selectedDifficulty);
  const setDifficulty = useGridStore((s) => s.setDifficulty);
  const status = useGridStore((s) => s.status);
  const disabled = status === "SEARCHING" || status === "GENERATING";
  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline-flex items-center gap-1 label-micro">
        <Gauge size={12} className="text-zinc-500" /> Difficulty
      </span>
      <div className="seg-shell" role="group" aria-label="Difficulty">
        {options.map((o) => (
          <button
            key={o.value}
            disabled={disabled}
            title={o.hint}
            onClick={() => setDifficulty(o.value)}
            className={`seg-btn ${selected === o.value ? "seg-btn-active" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
