import type { CellNode, Point } from "@/store/types";
import { getNeighbors } from "@/lib/utils/gridHelpers";

export async function dfs(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number,
  onVisit: (n: CellNode) => void,
  onFrontier: (n: CellNode) => void
): Promise<CellNode | null> {
  const s = grid[start.r][start.c];
  const stack: CellNode[] = [s];
  const seen = new Set<string>();
  s.parent = null;
  while (stack.length > 0) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const cur = stack.pop() as CellNode;
    const k = `${cur.r},${cur.c}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!(cur.r === start.r && cur.c === start.c)) onVisit(cur);
    if (cur.r === target.r && cur.c === target.c) return cur;
    if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
    const neigh = getNeighbors(grid, cur);
    for (let i = neigh.length - 1; i >= 0; i--) {
      const nb = neigh[i];
      const kk = `${nb.r},${nb.c}`;
      if (seen.has(kk)) continue;
      if (!nb.parent) nb.parent = { r: cur.r, c: cur.c };
      onFrontier(nb);
      stack.push(nb);
    }
  }
  return null;
}
