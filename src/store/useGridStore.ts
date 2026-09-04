"use client";
import { create } from "zustand";
import type {
  CellNode, Point, AlgorithmType, DifficultyType, SpeedType, EngineStatus, BrushType,
} from "./types";
import { DensityPresets } from "./types";
import { createGrid, getNode, nodeCost } from "@/lib/utils/gridHelpers";
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
import { GridAnimator } from "@/lib/animations/gridAnimator";
import type { AnimationSpeed, Coordinate } from "@/types/animation";

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
  pathCost: number;
  executionTimeMs: number;
  abortController: AbortController | null;
  densityKey: string;
  gridVersion: number;
  brush: BrushType;
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
  cancelAnimation: () => void;
  clearPath: () => void;
  clearWalls: () => void;
  fullReset: () => void;
  moveNode: (type: "start" | "target", to: Point) => void;
  setWall: (p: Point, isWall: boolean) => void;
  setCellType: (p: Point, t: "wall" | "weight" | "empty") => void;
  setBrush: (b: BrushType) => void;
  hydrateFromUrl: (algo?: AlgorithmType, diff?: DifficultyType, speed?: SpeedType) => void;
};

function getDensityPreset(key: string): { rows: number; cols: number } {
  return DensityPresets[key] ?? DensityPresets.balanced;
}

function speedToAnimation(speed: SpeedType): AnimationSpeed {
  switch (speed) {
    case "slow": return "SLOW";
    case "normal": return "MEDIUM";
    case "fast": return "FAST";
    case "instant": return "INSTANT";
    default: return "MEDIUM";
  }
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
  pathCost: 0,
  executionTimeMs: 0,
  abortController: null,
  densityKey: "balanced",
  gridVersion: 0,
  brush: "wall",

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
    GridAnimator.resetCellStyles();
    set({ rows: r, cols: c, grid, startNode: start, targetNode: target, status: "IDLE", nodesVisitedCount: 0, pathLength: 0, pathCost: 0, executionTimeMs: 0 });
  },

  hydrateFromUrl: (algo, diff, speed) => {
    const patch: Partial<StoreState> = {};
    if (algo) patch.selectedAlgorithm = algo;
    if (diff) patch.selectedDifficulty = diff;
    if (speed) patch.speed = speed;
    if (Object.keys(patch).length) set(patch);
  },

  setAlgorithm: (a) => {
    get().cancelAnimation();
    set({ selectedAlgorithm: a });
    const s = get();
    updateUrl({ algo: s.selectedAlgorithm, difficulty: s.selectedDifficulty, speed: s.speed });
  },
  setDifficulty: (d) => {
    get().cancelAnimation();
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
    get().cancelAnimation();
    const preset = getDensityPreset(key);
    set({ densityKey: key });
    get().initializeGrid(preset.rows, preset.cols);
  },

  cancelAnimation: () => {
    GridAnimator.cancelAnimation();
    GridAnimator.resetCellStyles();
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({ abortController: null, status: "IDLE" });
  },

  abort: () => {
    get().cancelAnimation();
  },

  clearPath: () => {
    get().cancelAnimation();
    const { grid } = get();
    for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
      const n = grid[r][c];
      if (n.state === "visited" || n.state === "frontier" || n.state === "path") {
        n.state = "unvisited"; n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null; n.parentB = null; n.gB = Infinity;
      }
    }
    GridAnimator.resetCellStyles();
    set({ grid: [...grid.map((row) => [...row])], status: "IDLE", nodesVisitedCount: 0, pathLength: 0, pathCost: 0, executionTimeMs: 0, abortController: null });
  },

  clearWalls: () => {
    get().cancelAnimation();
    const { grid, startNode, targetNode } = get();
    // Immutable cell updates (see moveNode): memoized GridCells compare by
    // type, so mutating nodes in place would leave stale wall visuals.
    const newGrid = grid.map((row) =>
      row.map((n) => ({
        ...n,
        type: "empty" as CellNode["type"],
        state: "unvisited" as CellNode["state"],
        g: Infinity, h: 0, f: Infinity,
        parent: null, parentB: null,
        gB: Infinity, hB: 0, fB: Infinity,
      }))
    );
    newGrid[startNode.r][startNode.c] = { ...newGrid[startNode.r][startNode.c], type: "start" as CellNode["type"] };
    newGrid[targetNode.r][targetNode.c] = { ...newGrid[targetNode.r][targetNode.c], type: "target" as CellNode["type"] };
    GridAnimator.resetCellStyles();
    set({ grid: newGrid, status: "IDLE", nodesVisitedCount: 0, pathLength: 0, pathCost: 0, executionTimeMs: 0, abortController: null });
  },

  fullReset: () => {
    get().cancelAnimation();
    const st = get();
    const preset = getDensityPreset(st.densityKey);
    const r = preset.rows % 2 === 0 ? preset.rows + 1 : preset.rows;
    const c = preset.cols % 2 === 0 ? preset.cols + 1 : preset.cols;
    const grid = createGrid(r, c);
    const start: Point = { r: 1, c: 1 };
    const target: Point = { r: r - 2, c: c - 2 };
    grid[start.r][start.c].type = "start";
    grid[target.r][target.c].type = "target";
    GridAnimator.resetCellStyles();
    set({ rows: r, cols: c, grid, startNode: start, targetNode: target, status: "IDLE", nodesVisitedCount: 0, pathLength: 0, pathCost: 0, executionTimeMs: 0, abortController: null });
  },

  moveNode: (type, to) => {
    const { grid, startNode, targetNode } = get();
    // Bounds-check: to comes from pointer math and must never index blindly.
    const dest = getNode(grid, to);
    if (!dest || dest.type === "wall") return;
    // Never allow one anchor to overwrite the other.
    if (type === "start" && to.r === targetNode.r && to.c === targetNode.c) return;
    if (type === "target" && to.r === startNode.r && to.c === startNode.c) return;
    // Immutable cell updates so memoized GridCells (which compare by type)
    // re-render: the previous objects are never mutated in place.
    const newGrid = grid.map((row) => [...row]);
    if (type === "start") {
      const old = grid[startNode.r][startNode.c];
      newGrid[startNode.r][startNode.c] = { ...old, type: "empty" };
      newGrid[to.r][to.c] = { ...dest, type: "start" };
      set({ grid: newGrid, startNode: { ...to } });
    } else {
      const old = grid[targetNode.r][targetNode.c];
      newGrid[targetNode.r][targetNode.c] = { ...old, type: "empty" };
      newGrid[to.r][to.c] = { ...dest, type: "target" };
      set({ grid: newGrid, targetNode: { ...to } });
    }
  },

  setWall: (p, isWall) => {
    get().setCellType(p, isWall ? "wall" : "empty");
  },

  setCellType: (p, t) => {
    const { grid, startNode, targetNode } = get();
    if ((p.r === startNode.r && p.c === startNode.c) || (p.r === targetNode.r && p.c === targetNode.c)) return;
    const n = getNode(grid, p);
    if (!n) return;
    if (n.type === t) return;
    // Immutable update (see moveNode): clone the cell so memo re-renders.
    const newGrid = grid.map((row) => [...row]);
    newGrid[p.r][p.c] = { ...n, type: t, state: "unvisited" };
    set({ grid: newGrid });
  },

  setBrush: (b) => set({ brush: b }),

  generateMaze: async () => {
    const st = get();
    get().cancelAnimation();
    const controller = new AbortController();
    set({ abortController: controller, status: "GENERATING" });
    for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) {
      const n = st.grid[r][c]; n.state = "unvisited"; n.parent = null; n.parentB = null; n.g = Infinity; n.gB = Infinity;
    }
    const start = { ...st.startNode }, target = { ...st.targetNode };
    const animSpeed = speedToAnimation(st.speed);
    // Collect walls before generation for diff
    const beforeWalls = new Set<string>();
    for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) if (st.grid[r][c].type === "wall") beforeWalls.add(`${r}-${c}`);
    try {
      const diff = st.selectedDifficulty;
      if (diff === "easy") {
        await cellularAutomata(st.grid, start, target, controller.signal, 0);
      } else if (diff === "medium") {
        await randomizedPrims(st.grid, start, target, controller.signal, 0);
      } else {
        await recursiveBacktracker(st.grid, start, target, controller.signal, 0);
      }
      if (controller.signal.aborted) return;
      // Diff newly-added walls for the pop animation. Cells that were cleared
      // back to empty must NOT be styled as walls (that desyncs visuals).
      const addedWalls: Coordinate[] = [];
      for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) {
        const n = st.grid[r][c];
        if (n.type === "wall" && !beforeWalls.has(`${r}-${c}`)) addedWalls.push({ row: r, col: c });
      }
      // Maze generators mutate nodes in place, which memoized GridCells would
      // not pick up. Bump gridVersion to remount the canvas with correct types.
      set({ grid: [...st.grid.map((row) => [...row])], gridVersion: get().gridVersion + 1 });
      // Wait for the remounted grid to commit before querying the DOM.
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => requestAnimationFrame(finish));
        }
        setTimeout(finish, 100);
      });
      if (controller.signal.aborted) return;
      // Animate only the newly-added walls.
      await GridAnimator.animateMazeGeneration(addedWalls, animSpeed);
      if (controller.signal.aborted) return;
      set({ status: "IDLE", nodesVisitedCount: 0, pathLength: 0, pathCost: 0, executionTimeMs: 0, abortController: null });
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      set({ status: "IDLE", abortController: null });
    }
  },

  runSearch: async () => {
    const st = get();
    if (st.abortController) st.abortController.abort();
    GridAnimator.cancelAnimation();
    // Clear previous path visuals
    for (let r = 0; r < st.grid.length; r++) for (let c = 0; c < st.grid[0].length; c++) {
      const n = st.grid[r][c];
      if (n.state === "visited" || n.state === "frontier" || n.state === "path") {
        n.state = "unvisited"; n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null; n.parentB = null; n.gB = Infinity;
      }
    }
    GridAnimator.resetCellStyles();
    const controller = new AbortController();
    set({ abortController: controller, status: "SEARCHING", nodesVisitedCount: 0, pathLength: 0, pathCost: 0, executionTimeMs: 0 });
    const animSpeed = speedToAnimation(st.speed);
    const t0 = performance.now();
    const visitedOrder: Coordinate[] = [];
    const onVisit = (n: CellNode) => {
      if (n.r === st.startNode.r && n.c === st.startNode.c) return;
      if (n.r === st.targetNode.r && n.c === st.targetNode.c) return;
      if (n.state === "visited") return;
      n.state = "visited";
      visitedOrder.push({ row: n.r, col: n.c });
    };
    const onFrontier = (n: CellNode) => {
      if (n.r === st.startNode.r && n.c === st.startNode.c) return;
      if (n.r === st.targetNode.r && n.c === st.targetNode.c) return;
      if (n.state !== "unvisited") return;
      n.state = "frontier";
    };
    try {
      let end: CellNode | null = null;
      const eu = st.isEuclidean;
      // Run algorithm in memory with zero delay to collect order
      switch (st.selectedAlgorithm) {
        case "bfs": end = await bfs(st.grid, st.startNode, st.targetNode, controller.signal, 0, onVisit, onFrontier); break;
        case "dfs": end = await dfs(st.grid, st.startNode, st.targetNode, controller.signal, 0, onVisit, onFrontier); break;
        case "dijkstra": end = await dijkstra(st.grid, st.startNode, st.targetNode, controller.signal, 0, onVisit, onFrontier); break;
        case "astar": end = await astar(st.grid, st.startNode, st.targetNode, controller.signal, 0, onVisit, onFrontier, eu); break;
        case "greedy": end = await greedy(st.grid, st.startNode, st.targetNode, controller.signal, 0, onVisit, onFrontier, eu); break;
        case "bibfs": end = await bidirectionalBFS(st.grid, st.startNode, st.targetNode, controller.signal, 0, onVisit, onFrontier); break;
        case "biastar": end = await bidirectionalAStar(st.grid, st.startNode, st.targetNode, controller.signal, 0, onVisit, onFrontier, eu); break;
      }
      if (controller.signal.aborted) return;
      const t1 = performance.now();
      if (!end) {
        set({ status: "UNREACHABLE", nodesVisitedCount: visitedOrder.length, pathLength: 0, pathCost: 0, executionTimeMs: t1 - t0, abortController: null });
        // Still animate visited to show unreachable
        await GridAnimator.animateVisitedNodes(visitedOrder, animSpeed, () => {
          set({ nodesVisitedCount: visitedOrder.length });
        });
        return;
      }
      // Reconstruct path
      let path: CellNode[] = [];
      if (st.selectedAlgorithm === "bibfs" || st.selectedAlgorithm === "biastar") {
        const fwd: CellNode[] = [];
        let cur: CellNode | null = end;
        while (cur) {
          fwd.push(cur);
          const p: Point | null = cur.parent;
          cur = p ? (getNode(st.grid, p) as CellNode | null) : null;
        }
        fwd.reverse();
        const bwd: CellNode[] = [];
        let cb: CellNode | null = end.parentB ? (getNode(st.grid, end.parentB) as CellNode | null) : null;
        while (cb) {
          bwd.push(cb);
          const pb: Point | null = cb.parentB;
          cb = pb ? (getNode(st.grid, pb) as CellNode | null) : null;
        }
        if (fwd.length && bwd.length && fwd[fwd.length - 1].r === bwd[0].r && fwd[fwd.length - 1].c === bwd[0].c) bwd.shift();
        path = [...fwd, ...bwd];
      } else {
        let cur: CellNode | null = end;
        while (cur) {
          path.push(cur);
          const p: Point | null = cur.parent;
          cur = p ? (getNode(st.grid, p) as CellNode | null) : null;
        }
        path.reverse();
      }
      const pathCoords: Coordinate[] = path
        .filter((n) => !(n.r === st.startNode.r && n.c === st.startNode.c) && !(n.r === st.targetNode.r && n.c === st.targetNode.c))
        .map((n) => ({ row: n.r, col: n.c }));
      // Animate visited then path via GridAnimator (60-120 FPS, no React re-render)
      await GridAnimator.animateVisitedNodes(visitedOrder, animSpeed, () => {
        set({ nodesVisitedCount: visitedOrder.length });
      });
      if (controller.signal.aborted) return;
      // True traversal cost: weights cost 5, everything else 1 (start excluded).
      let totalCost = 0;
      for (let i = 1; i < path.length; i++) totalCost += nodeCost(path[i]);
      await GridAnimator.animateShortestPath(pathCoords, () => {
        set({ pathLength: path.length - 1, pathCost: totalCost });
      });
      if (controller.signal.aborted) return;
      // Latency measures algorithm compute time (t1 - t0), not wall-clock
      // time including the visualization animation above.
      set({
        status: "FOUND",
        nodesVisitedCount: visitedOrder.length,
        pathLength: path.length - 1,
        pathCost: totalCost,
        executionTimeMs: t1 - t0,
        abortController: null,
      });
    } catch (e) {
      if ((e as DOMException).name === "AbortError") {
        set({ abortController: null, status: "IDLE" });
        return;
      }
      set({ status: "UNREACHABLE", abortController: null });
    }
  },
}));
