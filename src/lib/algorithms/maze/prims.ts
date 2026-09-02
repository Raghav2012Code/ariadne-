import type { CellNode, Point } from "@/store/types";

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function rand(n: number): number { return Math.floor(Math.random() * n); }

export async function randomizedPrims(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number
): Promise<void> {
  const rows = grid.length, cols = grid[0].length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const n = grid[r][c]; n.type = "wall"; n.state = "unvisited";
  }
  let cr = start.r % 2 === 0 ? start.r + 1 : start.r;
  let cc = start.c % 2 === 0 ? start.c + 1 : start.c;
  cr = clamp(cr, 1, rows - 2); cc = clamp(cc, 1, cols - 2);
  grid[cr][cc].type = "empty";
  const frontier: { r: number; c: number; fr: number; fc: number }[] = [];
  const add = (r: number, c: number, fr: number, fc: number) => {
    if (r <= 0 || r >= rows - 1 || c <= 0 || c >= cols - 1) return;
    if (grid[r][c].type !== "wall") return;
    frontier.push({ r, c, fr, fc });
  };
  const dirs: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2]];
  for (const [dr, dc] of dirs) add(cr + dr, cc + dc, cr, cc);
  let iter = 0;
  while (frontier.length > 0) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const idx = rand(frontier.length);
    const cur = frontier.splice(idx, 1)[0];
    if (grid[cur.r][cur.c].type !== "wall") continue;
    const wr = (cur.r + cur.fr) / 2, wc = (cur.c + cur.fc) / 2;
    grid[wr][wc].type = "empty";
    grid[cur.r][cur.c].type = "empty";
    for (const [dr, dc] of dirs) add(cur.r + dr, cur.c + dc, cur.r, cur.c);
    iter++;
    if (delay > 0 && iter % 4 === 0) await new Promise<void>((r) => setTimeout(r, delay));
  }
  grid[start.r][start.c].type = "start";
  grid[target.r][target.c].type = "target";
}
