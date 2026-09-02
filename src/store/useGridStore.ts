"use client";
import { create } from "zustand";
import type {
  CellNode, Point, AlgorithmType, DifficultyType, SpeedType, EngineStatus,
} from "./types";
import { DensityPresets, SpeedDelays } from "./types";
import { createGrid, getNode } from "@/lib/utils/gridHelpers";
import { recursiveBacktracker } from "@/lib/algorithms/maze/backtracker";
import { randomizedPrims } from "@/lib/algorithms/maze/prims";
import { cellularAutomata } from "@/lib/algorithms/maze/cellular";
import { bfs } from "@/lib/algorithms/search/bfs";
import { dfs } from "@/lib/algorithms/search/dfs";
import { dijkstra } from "@/lib/algorithms/search/dijkstra";
import { astar } from "@/lib/algorithms/search/astar";
import { greedy } from "@/lib/algorithms/search/greedy";
import { bidirectionalBFS, bidirectionalAStar } from "@/lib/algorithms/search/bidirectional";
import { updateUrl } from "@/lib/utils/urlState";

type StoreState = {
  rows: number;
  cols: number;
  grid: CellNode[][];
  startNode: Point;
  targetNode: Point;
  status: EngineStatus;
  selectedAlgorithm: AlgorithmType;
  selectedDifficulty: DifficultyType;
  speed: SpeedType;
  isEuclidean: boolean;
  nodesVisitedCount: number;
  pathLength: number;
  executionTimeMs: number;
  abortController: AbortController | null;
  densityKey: string;
};

type StoreActions = {
  initializeGrid: (rows?: number, cols?: number) => void;
  setAlgorithm: (a: AlgorithmType) => void;
  setDifficulty: (d: DifficultyType) => void;
  setSpeed: (s: SpeedType) => void;
  setEuclidean: (v: boolean) => void;
  setDensity: (key: string) => void;
  generateMaze: () => Promise<void>;
  runSearch: () => Promise<void>;
  abort: () => void;
  clearPath: () => void;
  clearWalls: () => void;
  fullReset: () => void;
  moveNode: (type: "start" | "target", to: Point) => void;
  setWall: (p: Point, isWall: boolean) => void;
  hydrateFromUrl: (algo?: AlgorithmType, diff?: DifficultyType, speed?: SpeedType) => void;
};

function getDensityPreset(key: string): { rows: number; cols: number } {
  return DensityPresets[key] ?? DensityPresets.balanced;
}

export const useGridStore = create<StoreState & StoreActions>((set, get) => ({
  rows: DensityPresets.balanced.rows,
  cols: DensityPresets.balanced.cols,
  grid: [],
  startNode: { r: 1, c: 1 },
  targetNode: { r: 23, c: 53 },
  status: "IDLE",
  selectedAlgorithm: "astar",
  selectedDifficulty: "medium",
  speed: "normal",
  isEuclidean: false,
  nodesVisitedCount: 0,
  pathLength: 0,
  executionTimeMs: 0,
  abortController: null,
  densityKey: "balanced",

  initializeGrid: (rows, cols) => {
    const st = get();
    const preset = rows && cols ? { rows, cols } : getDensityPreset(st.densityKey);
    let r = preset.rows, c = preset.cols;
    if (r % 2 === 0) r++; if (c % 2 === 0) c++;
    const grid = createGrid(r, c);
    const start: Point = { r: 1, c: 1 };
    const target: Point = { r: r - 2, c: c - 2 };
    grid[start.r][start.c].type = "start";
    grid[target.r][target.c].type = "target";
    set({ rows: r, cols: c, grid, startNode: start, targetNode: target, status: "IDLE", nodesVisitedCount: 0, pathLength: 0, executionTimeMs: 0 });
  },

  hydrateFromUrl: (algo, diff, speed) => {
    const patch: Partial<StoreState> = {};
    if (algo) patch.selectedAlgorithm = algo;
    if (diff) patch.selectedDifficulty = diff;
    if (speed) patch.speed = speed;
    if (Object.keys(patch).length) set(patch);
  },

  setAlgorithm: (a) => {
    set({ selectedAlgorithm: a });
    const s = get();
    updateUrl({ algo: s.selectedAlgorithm, difficulty: s.selectedDifficulty, speed: s.speed });
  },
  setDifficulty: (d) => {
    set({ selectedDifficulty: d });
    const s = get();
    updateUrl({ algo: s.selectedAlgorithm, difficulty: s.selectedDifficulty, speed: s.speed });
  },
  setSpeed: (s) => {
    set({ speed: s });
    const st = get();
    updateUrl({ algo: st.selectedAlgorithm, difficulty: st.selectedDifficulty, speed: s });
  },
  setEuclidean: (v) => set({ isEuclidean: v }),
  setDensity: (key) => {
    const preset = getDensityPreset(key);
    set({ densityKey: key });
    get().initializeGrid(preset.rows, preset.cols);
  },

  abort: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({ abortController: null, status: "IDLE" });
  },

  clearPath: () => {
    const { grid, abortController } = get();
    if (abortController) abortController.abort();
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
      const n = grid[r][c];
      if (n.state === "visited" || n.state === "frontier" || n.state === "path") {
        n.state = "unvisited"; n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null; n.parentB = null; n.gB = Infinity;
      }
    }
    set({ grid: [...grid.map((row) => [...row])], status: "IDLE", nodesVisitedCount: 0, pathLength: 0, executionTimeMs: 0, abortController: null });
  },

  clearWalls: () => {
    const { grid, startNode, targetNode, abortController } = get();
    if (abortController) abortController.abort();
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
      const n = grid[r][c]; n.type = "empty"; n.state = "unvisited"; n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null; n.parentB = null; n.gB = Infinity;
    }
    grid[startNode.r][startNode.c].type = "start";
    grid[targetNode.r][targetNode.c].type = "target";
    set({ grid: [...grid.map((row) => [...row])], status: "IDLE", nodesVisitedCount: 0, pathLength: 0, executionTimeMs: 0, abortController: null });
  },

  fullReset: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    const st = get();
    const preset = getDensityPreset(st.densityKey);
    const r = preset.rows % 2 === 0 ? preset.rows + 1 : preset.rows;
    const c = preset.cols % 2 === 0 ? preset.cols + 1 : preset.cols;
    const grid = createGrid(r, c);
    const start: Point = { r: 1, c: 1 };
    const target: Point = { r: r - 2, c: c - 2 };
    grid[start.r][start.c].type = "start";
    grid[target.r][target.c].type = "target";
    set({ rows: r, cols: c, grid, startNode: start, targetNode: target, status: "IDLE", nodesVisitedCount: 0, pathLength: 0, executionTimeMs: 0, abortController: null });
  },

  moveNode: (type, to) => {
    const { grid, startNode, targetNode } = get();
    if (grid[to.r][to.c].type === "wall") return;
    if (type === "start") {
      const old = grid[startNode.r][startNode.c];
      old.type = "empty";
      grid[to.r][to.c].type = "start";
      set({ grid: [...grid.map((row) => [...row])], startNode: { ...to } });
    } else {
      const old = grid[targetNode.r][targetNode.c];
      old.type = "empty";
      grid[to.r][to.c].type = "target";
      set({ grid: [...grid.map((row) => [...row])], targetNode: { ...to } });
    }
  },

  setWall: (p, isWall) => {
    const { grid, startNode, targetNode } = get();
    if ((p.r === startNode.r && p.c === startNode.c) || (p.r === targetNode.r && p.c === targetNode.c)) return;
    const n = getNode(grid, p);
    if (!n) return;
    n.type = isWall ? "wall" : "empty";
    n.state = "unvisited";
    set({ grid: [...grid.map((row) => [...row])] });
  },

  generateMaze: async () => {
    const st = get();
    if (st.abortController) st.abortController.abort();
    const controller = new AbortController();
    set({ abortController: controller, status: "GENERATING" });
    const delay = SpeedDelays[st.speed];
    // Clear path but keep walls will be overwritten
    for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) {
      const n = st.grid[r][c]; n.state = "unvisited"; n.parent = null; n.parentB = null; n.g = Infinity; n.gB = Infinity;
    }
    const start = { ...st.startNode }, target = { ...st.targetNode };
    try {
      const diff = st.selectedDifficulty;
      if (diff === "easy") {
        await cellularAutomata(st.grid, start, target, controller.signal, delay);
      } else if (diff === "medium") {
        await randomizedPrims(st.grid, start, target, controller.signal, delay);
      } else {
        await recursiveBacktracker(st.grid, start, target, controller.signal, delay);
      }
      if (controller.signal.aborted) return;
      set({ grid: [...st.grid.map((row) => [...row])], status: "IDLE", nodesVisitedCount: 0, pathLength: 0, executionTimeMs: 0, abortController: null });
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      set({ status: "IDLE", abortController: null });
    }
  },

  runSearch: async () => {
    const st = get();
    if (st.abortController) st.abortController.abort();
    // Clear previous path
    for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) {
      const n = st.grid[r][c];
      if (n.state === "visited" || n.state === "frontier" || n.state === "path") {
        n.state = "unvisited"; n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null; n.parentB = null; n.gB = Infinity;
      }
    }
    const controller = new AbortController();
    set({ abortController: controller, status: "SEARCHING", nodesVisitedCount: 0, pathLength: 0, executionTimeMs: 0 });
    const delay = SpeedDelays[st.speed];
    let visitedCount = 0;
    const onVisit = (n: CellNode) => {
      if (n.r === st.startNode.r && n.c === st.startNode.c) return;
      if (n.r === st.targetNode.r && n.c === st.targetNode.c) return;
      if (n.state === "visited") return;
      n.state = "visited";
      visitedCount++;
      // Directly update telemetry without full re-render of grid via store
      // Use requestAnimationFrame batch would be better, but we update count via store
    };
    const onFrontier = (n: CellNode) => {
      if (n.r === st.startNode.r && n.c === st.startNode.c) return;
      if (n.r === st.targetNode.r && n.c === st.targetNode.c) return;
      if (n.state !== "unvisited") return;
      n.state = "frontier";
    };
    const t0 = performance.now();
    // Telemetry interval to avoid 1000+ re-renders
    let telemetryTimer: number | null = null;
    if (delay > 0) {
      telemetryTimer = window.setInterval(() => {
        set({ nodesVisitedCount: visitedCount });
      }, 50);
    }
    try {
      let end: CellNode | null = null;
      const eu = st.isEuclidean;
      switch (st.selectedAlgorithm) {
        case "bfs": end = await bfs(st.grid, st.startNode, st.targetNode, controller.signal, delay, onVisit, onFrontier); break;
        case "dfs": end = await dfs(st.grid, st.startNode, st.targetNode, controller.signal, delay, onVisit, onFrontier); break;
        case "dijkstra": end = await dijkstra(st.grid, st.startNode, st.targetNode, controller.signal, delay, onVisit, onFrontier); break;
        case "astar": end = await astar(st.grid, st.startNode, st.targetNode, controller.signal, delay, onVisit, onFrontier, eu); break;
        case "greedy": end = await greedy(st.grid, st.startNode, st.targetNode, controller.signal, delay, onVisit, onFrontier, eu); break;
        case "bibfs": end = await bidirectionalBFS(st.grid, st.startNode, st.targetNode, controller.signal, delay, onVisit, onFrontier); break;
        case "biastar": end = await bidirectionalAStar(st.grid, st.startNode, st.targetNode, controller.signal, delay, onVisit, onFrontier, eu); break;
      }
      if (controller.signal.aborted) return;
      if (telemetryTimer) clearInterval(telemetryTimer);
      const t1 = performance.now();
      if (!end) {
        set({ status: "UNREACHABLE", nodesVisitedCount: visitedCount, executionTimeMs: t1 - t0, abortController: null, grid: [...st.grid.map((row) => [...row])] });
        return;
      }
      // Reconstruct path
      let path: CellNode[] = [];
      if (st.selectedAlgorithm === "bibfs" || st.selectedAlgorithm === "biastar") {
        // bidirectional reconstruct
        const fwd: CellNode[] = [];
        let cur: CellNode | null = end;
        const visitedParents = new Map<string, CellNode>();
        for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) visitedParents.set(`${r},${c}`, st.grid[r][c]);
        // fwd via parent
        let curF: CellNode | null = end;
        while (curF) {
          fwd.push(curF);
          const p: Point | null = curF.parent;
          curF = p ? (getNode(st.grid, p) as CellNode | null) : null;
        }
        fwd.reverse();
        const bwd: CellNode[] = [];
        let cb: CellNode | null = end.parentB ? (getNode(st.grid, end.parentB) as CellNode | null) : null;
        while (cb) {
          bwd.push(cb);
          const pb: Point | null = cb.parentB;
          cb = pb ? (getNode(st.grid, pb) as CellNode | null) : null;
        }
        // dedup meeting node
        if (fwd.length && bwd.length && fwd[fwd.length - 1].r === bwd[0].r && fwd[fwd.length - 1].c === bwd[0].c) bwd.shift();
        path = [...fwd, ...bwd];
      } else {
        let cur2: CellNode | null = end;
        while (cur2) {
          path.push(cur2);
          const p2: Point | null = cur2.parent;
          cur2 = p2 ? (getNode(st.grid, p2) as CellNode | null) : null;
        }
        path.reverse();
      }
      // Animate path
      if (delay === 0) {
        for (const n of path) {
          if ((n.r === st.startNode.r && n.c === st.startNode.c) || (n.r === st.targetNode.r && n.c === st.targetNode.c)) continue;
          n.state = "path";
        }
      } else {
        for (const n of path) {
          if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
          if ((n.r === st.startNode.r && n.c === st.startNode.c) || (n.r === st.targetNode.r && n.c === st.targetNode.c)) continue;
          n.state = "path";
          // force a micro paint
          await new Promise<void>((r) => setTimeout(r, Math.max(6, delay * 1.2)));
        }
      }
      const t2 = performance.now();
      // Cost for weighted
      let cost = 0;
      for (let i = 1; i < path.length; i++) cost += path[i].type === "weight" ? 5 : 1;
      const isWeighted = st.selectedAlgorithm === "dijkstra" || st.selectedAlgorithm === "astar" || st.selectedAlgorithm === "biastar";
      const labelLen = isWeighted && cost !== path.length - 1 ? path.length - 1 : path.length - 1;
      void labelLen;
      set({
        status: "FOUND",
        nodesVisitedCount: visitedCount,
        pathLength: path.length - 1,
        executionTimeMs: t2 - t0,
        abortController: null,
        grid: [...st.grid.map((row) => [...row])],
      });
    } catch (e) {
      if ((e as DOMException).name === "AbortError") {
        if (telemetryTimer) clearInterval(telemetryTimer);
        set({ abortController: null, status: "IDLE" });
        return;
      }
      if (telemetryTimer) clearInterval(telemetryTimer);
      set({ status: "UNREACHABLE", abortController: null });
    } finally {
      if (telemetryTimer) clearInterval(telemetryTimer);
    }
  },
}));
