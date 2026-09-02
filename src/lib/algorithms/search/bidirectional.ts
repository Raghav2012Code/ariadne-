import type { CellNode, Point } from "@/store/types";
import { getNeighbors, heuristic, nodeCost } from "@/lib/utils/gridHelpers";
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
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    const n = grid[r][c]; n.parent = null; n.parentB = null;
  }
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
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    const n = grid[r][c]; n.g = Infinity; n.h = 0; n.f = Infinity; n.parent = null; n.parentB = null; n.gB = Infinity; n.hB = 0; n.fB = Infinity;
  }
  const s = grid[start.r][start.c], t = grid[target.r][target.c];
  s.g = 0; s.h = heuristic(start, target, euclidean); s.f = s.h;
  t.gB = 0; t.hB = heuristic(target, start, euclidean); t.fB = t.hB;
  const pqF = new MinHeap<CellNode>((a, b) => a.f - b.f);
  const pqB = new MinHeap<CellNode>((a, b) => a.fB - b.fB);
  pqF.push(s); pqB.push(t);
  const closedF = new Set<string>(), closedB = new Set<string>();
  let best: CellNode | null = null;
  let bestCost = Infinity;
  const update = (n: CellNode) => {
    const c = (n.g === Infinity ? 1e9 : n.g) + (n.gB === Infinity ? 1e9 : n.gB);
    if (c < bestCost) { bestCost = c; best = n; }
  };
  while (!pqF.isEmpty() && !pqB.isEmpty()) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (!pqF.isEmpty()) {
      const cur = pqF.pop() as CellNode;
      const k = `${cur.r},${cur.c}`;
      if (!closedF.has(k)) {
        closedF.add(k);
        if (!(cur.r === start.r && cur.c === start.c)) onVisit(cur);
        if (closedB.has(k)) { update(cur); break; }
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
        if (closedF.has(k)) { update(cur); break; }
        if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
        for (const nb of getNeighbors(grid, cur)) {
          const kk = `${nb.r},${nb.c}`;
          if (closedB.has(kk)) continue;
          const tentative = (cur.gB === Infinity ? 0 : cur.gB) + nodeCost(nb);
          if (tentative < (nb.gB === Infinity ? 1e9 : nb.gB)) {
            nb.parentB = { r: cur.r, c: cur.c };
            nb.gB = tentative; nb.hB = heuristic({ r: nb.r, c: nb.c }, start, euclidean); nb.fB = nb.gB + nb.hB;
            onFrontier(nb); pqB.push(nb);
            if (closedF.has(kk)) update(nb);
          }
        }
      }
    }
    if (best) break;
  }
  if (best) return best;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) {
    const n = grid[r][c]; if (n.g !== Infinity && n.gB !== Infinity) return n;
  }
  return null;
}
