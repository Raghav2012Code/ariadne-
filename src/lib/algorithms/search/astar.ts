import type { CellNode, Point } from "@/store/types";
import { getNeighbors, heuristic, nodeCost, resetSearchState } from "@/lib/utils/gridHelpers";
import { MinHeap } from "@/lib/algorithms/data-structures/MinHeap";

export async function astar(
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
  s.g = 0; s.h = heuristic(start, target, euclidean); s.f = s.h;
  const pq = new MinHeap<CellNode>((a, b) => a.f - b.f);
  pq.push(s);
  const closed = new Set<string>();
  while (!pq.isEmpty()) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const cur = pq.pop() as CellNode;
    const k = `${cur.r},${cur.c}`;
    if (closed.has(k)) continue;
    closed.add(k);
    if (!(cur.r === start.r && cur.c === start.c)) onVisit(cur);
    if (cur.r === target.r && cur.c === target.c) return cur;
    if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
    for (const nb of getNeighbors(grid, cur)) {
      const kk = `${nb.r},${nb.c}`;
      if (closed.has(kk)) continue;
      const tentative = cur.g + nodeCost(nb);
      if (tentative < nb.g) {
        nb.parent = { r: cur.r, c: cur.c };
        nb.g = tentative;
        nb.h = heuristic({ r: nb.r, c: nb.c }, target, euclidean);
        nb.f = nb.g + nb.h;
        onFrontier(nb);
        pq.push(nb);
      }
    }
  }
  return null;
}
