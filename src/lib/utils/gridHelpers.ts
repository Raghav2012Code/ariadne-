import type { CellNode, Point } from "@/store/types";

export function createNode(r: number, c: number): CellNode {
  return {
    r, c,
    type: "empty",
    state: "unvisited",
    g: Infinity, h: 0, f: Infinity,
    parent: null, parentB: null,
    gB: Infinity, hB: 0, fB: Infinity,
  };
}

export function createGrid(rows: number, cols: number): CellNode[][] {
  if (rows % 2 === 0) rows++;
  if (cols % 2 === 0) cols++;
  const grid: CellNode[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => createNode(r, c))
  );
  return grid;
}

export function getNode(grid: CellNode[][], p: Point): CellNode | null {
  if (p.r < 0 || p.r >= grid.length || p.c < 0 || p.c >= grid[0].length) return null;
  return grid[p.r][p.c];
}

export function getNeighbors(grid: CellNode[][], node: CellNode): CellNode[] {
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const res: CellNode[] = [];
  for (const [dr, dc] of dirs) {
    const nr = node.r + dr, nc = node.c + dc;
    const nb = getNode(grid, { r: nr, c: nc });
    if (!nb || nb.type === "wall") continue;
    res.push(nb);
  }
  return res;
}

export function heuristic(a: Point, b: Point, euclidean = false): number {
  const dx = Math.abs(a.r - b.r), dy = Math.abs(a.c - b.c);
  return euclidean ? Math.hypot(dx, dy) : dx + dy;
}

export function nodeCost(node: CellNode): number {
  return node.type === "weight" ? 5 : 1;
}

export function isSame(a: Point, b: Point): boolean {
  return a.r === b.r && a.c === b.c;
}

// Reset every search-traversal field so algorithms stay correct on grid
// reuse: stale parents or g-scores from a previous run must not leak in.
// Deliberately leaves type/state alone (maze layout and visuals are the caller's job).
export function resetSearchState(grid: CellNode[][]): void {
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    const n = grid[r][c];
    n.g = Infinity; n.h = 0; n.f = Infinity;
    n.parent = null; n.parentB = null;
    n.gB = Infinity; n.hB = 0; n.fB = Infinity;
  }
}

export function calculateCellSize(
  availW: number,
  availH: number,
  cols: number,
  rows: number
): number {
  const gap = 1, pad = 4;
  const w = Math.floor((availW - pad - (cols - 1) * gap) / cols);
  const h = Math.floor((availH - pad - (rows - 1) * gap) / rows);
  return Math.max(6, Math.min(26, Math.min(w, h)));
}
