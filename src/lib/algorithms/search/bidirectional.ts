import type { CellNode, Point } from "@/store/types";
import { getNeighbors, heuristic, nodeCost, resetSearchState } from "@/lib/utils/gridHelpers";
import { MinHeap } from "@/lib/algorithms/data-structures/MinHeap";

export async function bidirectionalBFS(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number,
  onVisit: (n: CellNode) => void,
  onFrontier: (n: CellNode) => void
): Promise<CellNode | null> {
  resetSearchState(grid);
  const s = grid[start.r][start.c], t = grid[target.r][target.c];
  const qF: CellNode[] = [s], qB: CellNode[] = [t];
  const seenF = new Set<string>([`${s.r},${s.c}`]), seenB = new Set<string>([`${t.r},${t.c}`]);
  const visitedF = new Set<string>(), visitedB = new Set<string>();
  onFrontier(s); onFrontier(t);
  while (qF.length > 0 && qB.length > 0) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (qF.length > 0) {
      const cur = qF.shift() as CellNode;
      const k = `${cur.r},${cur.c}`;
      if (!visitedF.has(k)) {
        visitedF.add(k);
        if (!(cur.r === start.r && cur.c === start.c) && !(cur.r === target.r && cur.c === target.c)) onVisit(cur);
        if (seenB.has(k)) return cur;
        if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
        for (const nb of getNeighbors(grid, cur)) {
          const kk = `${nb.r},${nb.c}`;
          if (seenF.has(kk)) continue;
          seenF.add(kk);
          nb.parent = { r: cur.r, c: cur.c };
          onFrontier(nb);
          qF.push(nb);
          if (seenB.has(kk)) return nb;
        }
      }
    }
    if (qB.length > 0) {
      const cur = qB.shift() as CellNode;
      const k = `${cur.r},${cur.c}`;
      if (!visitedB.has(k)) {
        visitedB.add(k);
        if (!(cur.r === start.r && cur.c === start.c) && !(cur.r === target.r && cur.c === target.c)) onVisit(cur);
        if (seenF.has(k)) return cur;
        if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
        for (const nb of getNeighbors(grid, cur)) {
          const kk = `${nb.r},${nb.c}`;
          if (seenB.has(kk)) continue;
          seenB.add(kk);
          nb.parentB = { r: cur.r, c: cur.c };
          onFrontier(nb);
          qB.push(nb);
          if (seenF.has(kk)) return nb;
        }
      }
    }
  }
  return null;
}

export async function bidirectionalAStar(
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
  const s = grid[start.r][start.c], t = grid[target.r][target.c];
  s.g = 0; s.h = heuristic(start, target, euclidean); s.f = s.h;
  t.gB = 0; t.hB = heuristic(target, start, euclidean); t.fB = t.hB;
  const pqF = new MinHeap<CellNode>((a, b) => a.f - b.f);
  const pqB = new MinHeap<CellNode>((a, b) => a.fB - b.fB);
  pqF.push(s); pqB.push(t);
  const closedF = new Set<string>(), closedB = new Set<string>();
  let best: CellNode | null = null;
  let bestCost = Infinity;
  // Every s-t path P satisfies cost(P) >= min-f of the forward open list AND
  // cost(P) >= min-f of the backward open list (admissible heuristics), so
  // cost(P) >= max(minF_F, minF_B). Once the best meeting found is no worse
  // than that bound, no undiscovered path can beat it: it is optimal.
  const update = (n: CellNode) => {
    if (n.g === Infinity || n.gB === Infinity) return;
    const c = n.g + n.gB;
    if (c < bestCost) { bestCost = c; best = n; }
  };
  const minF = (pq: MinHeap<CellNode>, key: "f" | "fB"): number => {
    const top = pq.peek();
    return top ? top[key] : Infinity;
  };
  while (!pqF.isEmpty() && !pqB.isEmpty()) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (!pqF.isEmpty()) {
      const cur = pqF.pop() as CellNode;
      const k = `${cur.r},${cur.c}`;
      if (!closedF.has(k)) {
        closedF.add(k);
        if (!(cur.r === start.r && cur.c === start.c)) onVisit(cur);
        if (closedB.has(k)) update(cur);
        if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
        for (const nb of getNeighbors(grid, cur)) {
          const kk = `${nb.r},${nb.c}`;
          if (closedF.has(kk)) continue;
          const tentative = cur.g + nodeCost(nb);
          if (tentative < nb.g) {
            nb.parent = { r: cur.r, c: cur.c };
            nb.g = tentative; nb.h = heuristic({ r: nb.r, c: nb.c }, target, euclidean); nb.f = nb.g + nb.h;
            onFrontier(nb); pqF.push(nb);
            if (closedB.has(kk)) update(nb);
          }
        }
      }
    }
    if (!pqB.isEmpty()) {
      const cur = pqB.pop() as CellNode;
      const k = `${cur.r},${cur.c}`;
      if (!closedB.has(k)) {
        closedB.add(k);
        if (!(cur.r === target.r && cur.c === target.c)) onVisit(cur);
        if (closedF.has(k)) update(cur);
        if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
        for (const nb of getNeighbors(grid, cur)) {
          const kk = `${nb.r},${nb.c}`;
          if (closedB.has(kk)) continue;
          // cur came from pqB so cur.gB is finite; an infinite tentative can
          // never improve nb.gB and is safely ignored.
          const tentative = cur.gB + nodeCost(nb);
          if (tentative < nb.gB) {
            nb.parentB = { r: cur.r, c: cur.c };
            nb.gB = tentative; nb.hB = heuristic({ r: nb.r, c: nb.c }, start, euclidean); nb.fB = nb.gB + nb.hB;
            onFrontier(nb); pqB.push(nb);
            if (closedF.has(kk)) update(nb);
          }
        }
      }
    }
    if (best && Math.max(minF(pqF, "f"), minF(pqB, "fB")) >= bestCost) break;
  }
  if (best) return best;
  // No meeting recorded: return the lowest-cost doubly-reached node, if any.
  let fallback: CellNode | null = null;
  let fallbackCost = Infinity;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    const n = grid[r][c];
    if (n.g !== Infinity && n.gB !== Infinity && n.g + n.gB < fallbackCost) {
      fallbackCost = n.g + n.gB;
      fallback = n;
    }
  }
  return fallback;
}
