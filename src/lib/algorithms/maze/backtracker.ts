import type { CellNode, Point } from "@/store/types";

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function rand(n: number): number { return Math.floor(Math.random() * n); }
function choice<T>(arr: T[]): T { return arr[rand(arr.length)]; }

export async function recursiveBacktracker(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number
): Promise<void> {
  const rows = grid.length, cols = grid[0].length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const n = grid[r][c]; n.type = "wall"; n.state = "unvisited"; n.parent = null; n.parentB = null;
  }
  const carve = (r: number, c: number) => { grid[r][c].type = "empty"; };
  const sr = (start.r % 2 === 0 ? start.r + 1 : start.r);
  const sc = (start.c % 2 === 0 ? start.c + 1 : start.c);
  const startCarve = { r: clamp(sr, 1, rows - 2), c: clamp(sc, 1, cols - 2) };
  carve(startCarve.r, startCarve.c);
  const stack: Point[] = [startCarve];
  const visited = new Set<string>([`${startCarve.r},${startCarve.c}`]);
  const dirs: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]];
  let steps = 0;
  while (stack.length > 0) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const cur = stack[stack.length - 1];
    const cand: { r: number; c: number; dr: number; dc: number }[] = [];
    for (const [dr, dc] of dirs) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (nr <= 0 || nr >= rows - 1 || nc <= 0 || nc >= cols - 1) continue;
      const k = `${nr},${nc}`;
      if (visited.has(k)) continue;
      cand.push({ r: nr, c: nc, dr, dc });
    }
    if (cand.length === 0) { stack.pop(); continue; }
    const nxt = choice(cand);
    visited.add(`${nxt.r},${nxt.c}`);
    carve(cur.r + nxt.dr / 2, cur.c + nxt.dc / 2);
    carve(nxt.r, nxt.c);
    stack.push({ r: nxt.r, c: nxt.c });
    steps++;
    if (delay > 0 && steps % 3 === 0) await new Promise<void>((r) => setTimeout(r, delay));
  }
  grid[start.r][start.c].type = "start";
  grid[target.r][target.c].type = "target";
  for (const p of [start, target]) {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const n = grid[p.r + dr]?.[p.c + dc];
      if (n && n.type === "wall" && Math.random() < 0.92) n.type = "empty";
    }
  }
}
