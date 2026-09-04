import type { CellNode, Point } from "@/store/types";
import { getNeighbors, resetSearchState } from "@/lib/utils/gridHelpers";

export async function bfs(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number,
  onVisit: (n: CellNode) => void,
  onFrontier: (n: CellNode) => void
): Promise<CellNode | null> {
  // Reset search state so the algorithm is correct on grid reuse (stale
  // parents/g-scores from a previous run must not leak into this one).
  resetSearchState(grid);
  const s = grid[start.r][start.c];
  const q: CellNode[] = [s];
  const seen = new Set<string>([`${s.r},${s.c}`]);
  s.g = 0;
  s.parent = null;
  onFrontier(s);
  while (q.length > 0) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const cur = q.shift() as CellNode;
    if (cur.state === "frontier") cur.state = "unvisited";
    if (!(cur.r === start.r && cur.c === start.c)) onVisit(cur);
    if (cur.r === target.r && cur.c === target.c) return cur;
    if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
    for (const nb of getNeighbors(grid, cur)) {
      const k = `${nb.r},${nb.c}`;
      if (seen.has(k)) continue;
      seen.add(k);
      nb.parent = { r: cur.r, c: cur.c };
      nb.g = cur.g + 1;
      onFrontier(nb);
      q.push(nb);
    }
  }
  return null;
}
