"use client";
import * as React from "react";
import { useGridStore } from "@/store/useGridStore";
import { GridCell } from "./GridCell";
import { calculateCellSize } from "@/lib/utils/gridHelpers";

export function GridCanvas() {
  const grid = useGridStore((s) => s.grid);
  const rows = useGridStore((s) => s.rows);
  const cols = useGridStore((s) => s.cols);
  const startNode = useGridStore((s) => s.startNode);
  const targetNode = useGridStore((s) => s.targetNode);
  const moveNode = useGridStore((s) => s.moveNode);
  const setWall = useGridStore((s) => s.setWall);
  const status = useGridStore((s) => s.status);

  const stageRef = React.useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = React.useState(16);
  const dragRef = React.useRef<"start" | "target" | null>(null);
  const mouseDownRef = React.useRef(false);
  const mouseButtonRef = React.useRef(0);

  const compute = React.useCallback(() => {
    const nav = document.getElementById("nav");
    const legend = document.getElementById("legend");
    const ribbon = document.getElementById("ribbon");
    const navH = nav?.offsetHeight ?? 110;
    const legH = legend?.offsetHeight ?? 40;
    const ribH = ribbon?.offsetHeight ?? 56;
    const availW = window.innerWidth - 48;
    const availH = window.innerHeight - navH - legH - ribH - 40;
    const size = calculateCellSize(availW, availH, cols, rows);
    setCellSize(size);
  }, [cols, rows]);

  React.useEffect(() => {
    compute();
    let t: number | null = null;
    const debounced = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(compute, 80);
    };
    window.addEventListener("resize", debounced);
    window.addEventListener("orientationchange", debounced);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(debounced);
      if (stageRef.current) ro.observe(stageRef.current);
      const nav = document.getElementById("nav");
      const legend = document.getElementById("legend");
      const ribbon = document.getElementById("ribbon");
      if (nav) ro.observe(nav);
      if (legend) ro.observe(legend);
      if (ribbon) ro.observe(ribbon);
    }
    return () => {
      window.removeEventListener("resize", debounced);
      window.removeEventListener("orientationchange", debounced);
      if (t) window.clearTimeout(t);
      if (ro) ro.disconnect();
    };
  }, [compute]);

  const getCellFromPoint = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const cell = el?.closest("[data-node]") as HTMLElement | null;
    if (!cell) return null;
    const attr = cell.getAttribute("data-node");
    if (!attr) return null;
    const [rStr, cStr] = attr.split("-");
    const r = parseInt(rStr, 10), c = parseInt(cStr, 10);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return { r, c };
  };

  const isVisualizing = status === "SEARCHING" || status === "GENERATING";

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isVisualizing) return;
    const target = e.target as HTMLElement;
    const cell = target.closest("[data-node]") as HTMLElement | null;
    if (!cell) return;
    const attr = cell.getAttribute("data-node") ?? "";
    const [rStr, cStr] = attr.split("-");
    const r = parseInt(rStr, 10), c = parseInt(cStr, 10);
    if (r === startNode.r && c === startNode.c) { dragRef.current = "start"; return; }
    if (r === targetNode.r && c === targetNode.c) { dragRef.current = "target"; return; }
    dragRef.current = null;
    mouseDownRef.current = true;
    mouseButtonRef.current = e.button;
    const isWall = !(e.shiftKey || e.button === 2);
    setWall({ r, c }, isWall);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isVisualizing) return;
    if (dragRef.current) {
      const p = getCellFromPoint(e.clientX, e.clientY);
      if (!p) return;
      const gridNode = grid[p.r]?.[p.c];
      if (!gridNode || gridNode.type === "wall") return;
      moveNode(dragRef.current, p);
      return;
    }
    if (!mouseDownRef.current) return;
    const target = e.target as HTMLElement;
    const cell = target.closest("[data-node]") as HTMLElement | null;
    let p: { r: number; c: number } | null = null;
    if (cell) {
      const attr = cell.getAttribute("data-node") ?? "";
      const [rStr, cStr] = attr.split("-");
      p = { r: parseInt(rStr, 10), c: parseInt(cStr, 10) };
    } else {
      p = getCellFromPoint(e.clientX, e.clientY);
    }
    if (!p) return;
    const isWall = !(e.shiftKey || mouseButtonRef.current === 2);
    setWall(p, isWall);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    mouseDownRef.current = false;
    dragRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  if (grid.length === 0) return null;

  return (
    <div ref={stageRef} className="flex-1 min-h-0 flex items-center justify-center px-4 lg:px-6 py-4 overflow-hidden touch-none relative">
      <div
        role="grid"
        aria-label="Maze grid"
        className="grid-enter relative grid gap-[1.5px] rounded-xl border border-white/[0.08] bg-[#0c0e13] p-2 shrink-0 select-none touch-none shadow-[0_12px_40px_rgba(0,0,0,.5)]"
        style={
          {
            gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            "--cell-size": `${cellSize}px`,
          } as React.CSSProperties
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {grid.map((row) => row.map((node) => <GridCell key={`${node.r}-${node.c}`} node={node} />))}
      </div>
    </div>
  );
}
