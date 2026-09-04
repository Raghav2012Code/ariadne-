import type { CellNode, Point } from "@/store/types";
import { getNeighbors, heuristic, resetSearchState } from "@/lib/utils/gridHelpers";
import { MinHeap } from "@/lib/algorithms/data-structures/MinHeap";

export async function greedy(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number,
  onVisit: (n: CellNode) => void,
  onFrontier: (n: CellNode) => void,
  euclidean = false
): Promise<CellNode | null> {
  resetSearchState(grid);
  const s = grid[start.r][start.c];
  s.h = heuristic(start, target, euclidean); s.f = s.h;
  const pq = new MinHeap<CellNode>((a, b) => a.f - b.f);
  pq.push(s);
  const seen = new Set<string>();
  while (!pq.isEmpty()) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const cur = pq.pop() as CellNode;
    const k = `${cur.r},${cur.c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!(cur.r === start.r && cur.c === start.c)) onVisit(cur);
    if (cur.r === target.r && cur.c === target.c) return cur;
    if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
    for (const nb of getNeighbors(grid, cur)) {
      const kk = `${nb.r},${nb.c}`;
      if (seen.has(kk)) continue;
      if (nb.parent) continue;
      nb.parent = { r: cur.r, c: cur.c };
      nb.h = heuristic({ r: nb.r, c: nb.c }, target, euclidean);
      nb.f = nb.h;
      onFrontier(nb);
      pq.push(nb);
    }
  }
  return null;
}
