import type { CellNode, Point } from "@/store/types";
import { getNeighbors, nodeCost } from "@/lib/utils/gridHelpers";
import { MinHeap } from "@/lib/algorithms/data-structures/MinHeap";

export async function dijkstra(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number,
  onVisit: (n: CellNode) => void,
  onFrontier: (n: CellNode) => void
): Promise<CellNode | null> {
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    const n = grid[r][c]; n.g = Infinity; n.f = Infinity; n.parent = null;
  }
  const s = grid[start.r][start.c];
  s.g = 0; s.f = 0;
  const pq = new MinHeap<CellNode>((a, b) => a.g - b.g);
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
      const alt = cur.g + nodeCost(nb);
      if (alt < nb.g) {
        nb.g = alt; nb.f = alt; nb.parent = { r: cur.r, c: cur.c };
        onFrontier(nb);
        pq.push(nb);
      }
    }
  }
  return null;
}
