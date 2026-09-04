import { describe, expect, it } from "vitest";
import type { CellNode, Point } from "@/store/types";
import { createGrid, getNode, nodeCost } from "@/lib/utils/gridHelpers";
import { astar } from "@/lib/algorithms/search/astar";
import { dijkstra } from "@/lib/algorithms/search/dijkstra";
import { bfs } from "@/lib/algorithms/search/bfs";
import { dfs } from "@/lib/algorithms/search/dfs";
import { greedy } from "@/lib/algorithms/search/greedy";
import {
  bidirectionalBFS,
  bidirectionalAStar,
} from "@/lib/algorithms/search/bidirectional";

const noop = (_n: CellNode) => {};
const freshSignal = () => new AbortController().signal;

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeOpen(rows = 15, cols = 15): {
  grid: CellNode[][];
  start: Point;
  target: Point;
} {
  const grid = createGrid(rows, cols);
  const start = { r: 1, c: 1 };
  const target = { r: grid.length - 2, c: grid[0].length - 2 };
  grid[start.r][start.c].type = "start";
  grid[target.r][target.c].type = "target";
  return { grid, start, target };
}

function makeWeighted(rows: number, cols: number, seed: number): {
  grid: CellNode[][];
  start: Point;
  target: Point;
} {
  const { grid, start, target } = makeOpen(rows, cols);
  const rand = mulberry32(seed);
  for (let r = 1; r < grid.length - 1; r++) {
    for (let c = 1; c < grid[0].length - 1; c++) {
      if (Math.abs(r - start.r) + Math.abs(c - start.c) <= 1) continue;
      if (Math.abs(r - target.r) + Math.abs(c - target.c) <= 1) continue;
      const roll = rand();
      if (roll < 0.12) grid[r][c].type = "wall";
      else if (roll < 0.34) grid[r][c].type = "weight";
    }
  }
  return { grid, start, target };
}

function traceForward(end: CellNode, grid: CellNode[][]): CellNode[] {
  const path: CellNode[] = [];
  let cur: CellNode | null = end;
  const guard = grid.length * grid[0].length + 10;
  while (cur && path.length <= guard) {
    path.push(cur);
    cur = cur.parent ? (getNode(grid, cur.parent) as CellNode | null) : null;
  }
  return path.reverse();
}

function expectConnected(path: CellNode[], start: Point, target: Point): void {
  expect(path.length).toBeGreaterThan(1);
  expect({ r: path[0].r, c: path[0].c }).toEqual(start);
  expect({ r: path[path.length - 1].r, c: path[path.length - 1].c }).toEqual(
    target
  );
  for (let i = 1; i < path.length; i++) {
    const d =
      Math.abs(path[i].r - path[i - 1].r) +
      Math.abs(path[i].c - path[i - 1].c);
    expect(d).toBe(1);
  }
}

function pathCost(path: CellNode[]): number {
  let cost = 0;
  for (let i = 1; i < path.length; i++) cost += nodeCost(path[i]);
  return cost;
}

function traceBidirectional(
  end: CellNode,
  grid: CellNode[][],
  start: Point,
  target: Point
): CellNode[] {
  const fwd = traceForward(end, grid);
  const bwd: CellNode[] = [];
  let cb: CellNode | null = end.parentB
    ? (getNode(grid, end.parentB) as CellNode | null)
    : null;
  const guard = grid.length * grid[0].length + 10;
  while (cb && bwd.length <= guard) {
    bwd.push(cb);
    cb = cb.parentB ? (getNode(grid, cb.parentB) as CellNode | null) : null;
  }
  if (
    fwd.length &&
    bwd.length &&
    fwd[fwd.length - 1].r === bwd[0].r &&
    fwd[fwd.length - 1].c === bwd[0].c
  ) {
    bwd.shift();
  }
  const full = [...fwd, ...bwd];
  expectConnected(full, start, target);
  return full;
}

describe("search algorithms", () => {
  it("astar finds the optimal path on an open grid", async () => {
    const { grid, start, target } = makeOpen();
    const end = await astar(grid, start, target, freshSignal(), 0, noop, noop);
    expect(end).not.toBeNull();
    const path = traceForward(end as CellNode, grid);
    expectConnected(path, start, target);
    // (1,1) -> (13,13): manhattan distance 24, all cost 1.
    expect(pathCost(path)).toBe(24);
  });

  it("bfs finds the shortest unweighted path", async () => {
    const { grid, start, target } = makeOpen();
    const end = await bfs(grid, start, target, freshSignal(), 0, noop, noop);
    expect(end).not.toBeNull();
    const path = traceForward(end as CellNode, grid);
    expectConnected(path, start, target);
    expect(path.length - 1).toBe(24);
  });

  it("dfs reaches the target without queueing duplicates", async () => {
    const { grid, start, target } = makeOpen(25, 25);
    let frontierCalls = 0;
    const end = await dfs(
      grid,
      start,
      target,
      freshSignal(),
      0,
      noop,
      () => {
        frontierCalls++;
      }
    );
    expect(end).not.toBeNull();
    expectConnected(traceForward(end as CellNode, grid), start, target);
    // Each cell is queued at most once: frontier callbacks stay linear.
    expect(frontierCalls).toBeLessThanOrEqual(25 * 25);
  });

  it("greedy reaches the target on an open grid", async () => {
    const { grid, start, target } = makeOpen();
    const end = await greedy(grid, start, target, freshSignal(), 0, noop, noop);
    expect(end).not.toBeNull();
    expectConnected(traceForward(end as CellNode, grid), start, target);
  });

  it("bidirectional BFS yields a connected start-to-target path", async () => {
    const { grid, start, target } = makeOpen();
    const end = await bidirectionalBFS(
      grid,
      start,
      target,
      freshSignal(),
      0,
      noop,
      noop
    );
    expect(end).not.toBeNull();
    traceBidirectional(end as CellNode, grid, start, target);
  });

  it.each([1, 2, 3])(
    "dijkstra and astar agree on optimal cost (weighted seed %i)",
    async (seed) => {
      const a = makeWeighted(21, 21, seed);
      const b = makeWeighted(21, 21, seed);
      const endD = await dijkstra(
        a.grid,
        a.start,
        a.target,
        freshSignal(),
        0,
        noop,
        noop
      );
      const endA = await astar(
        b.grid,
        b.start,
        b.target,
        freshSignal(),
        0,
        noop,
        noop
      );
      expect(endD).not.toBeNull();
      expect(endA).not.toBeNull();
      const costD = pathCost(traceForward(endD as CellNode, a.grid));
      const costA = pathCost(traceForward(endA as CellNode, b.grid));
      expect(costA).toBe(costD);
    }
  );

  it.each([1, 2, 3, 4, 5, 6])(
    "bidirectional A* is optimal vs dijkstra (weighted seed %i)",
    async (seed) => {
      const a = makeWeighted(21, 21, seed);
      const b = makeWeighted(21, 21, seed);
      const endD = await dijkstra(
        a.grid,
        a.start,
        a.target,
        freshSignal(),
        0,
        noop,
        noop
      );
      const endB = await bidirectionalAStar(
        b.grid,
        b.start,
        b.target,
        freshSignal(),
        0,
        noop,
        noop
      );
      if (endD === null) {
        expect(endB).toBeNull();
        return;
      }
      expect(endB).not.toBeNull();
      const full = traceBidirectional(
        endB as CellNode,
        b.grid,
        b.start,
        b.target
      );
      expect(pathCost(full)).toBe(
        pathCost(traceForward(endD as CellNode, a.grid))
      );
    }
  );

  it("returns null when the target is walled off", async () => {
    const runners = [
      astar,
      dijkstra,
      bfs,
      dfs,
      greedy,
      bidirectionalBFS,
      bidirectionalAStar,
    ];
    for (const run of runners) {
      const { grid, start, target } = makeOpen(11, 11);
      for (let r = 0; r < grid.length; r++) {
        for (const c of [target.c - 1, target.c + 1]) {
          if (grid[r]?.[c] && !(r === start.r && c === start.c)) {
            grid[r][c].type = "wall";
          }
        }
      }
      for (let c = 0; c < grid[0].length; c++) {
        for (const r of [target.r - 1, target.r + 1]) {
          if (grid[r]?.[c] && !(r === start.r && c === start.c)) {
            grid[r][c].type = "wall";
          }
        }
      }
      const end = await run(grid, start, target, freshSignal(), 0, noop, noop);
      expect(end).toBeNull();
    }
  });

  it("dfs stays correct when reusing a grid after another algorithm ran", async () => {
    const { grid, start, target } = makeOpen();
    // Fill the grid with stale parents/scores first.
    await bfs(grid, start, target, freshSignal(), 0, noop, noop);
    const end = await dfs(grid, start, target, freshSignal(), 0, noop, noop);
    expect(end).not.toBeNull();
    expectConnected(traceForward(end as CellNode, grid), start, target);
  });

  it("greedy stays correct when reusing a grid after BFS ran", async () => {
    const { grid, start, target } = makeOpen();
    await bfs(grid, start, target, freshSignal(), 0, noop, noop);
    const end = await greedy(
      grid,
      start,
      target,
      freshSignal(),
      0,
      noop,
      noop
    );
    expect(end).not.toBeNull();
    expectConnected(traceForward(end as CellNode, grid), start, target);
  });
});
