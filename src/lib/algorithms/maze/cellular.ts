import type { CellNode, Point } from "@/store/types";

export async function cellularAutomata(
  grid: CellNode[][],
  start: Point,
  target: Point,
  signal: AbortSignal,
  delay: number
): Promise<void> {
  const rows = grid.length, cols = grid[0].length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    grid[r][c].type = Math.random() < 0.42 ? "wall" : "empty";
    grid[r][c].state = "unvisited";
  }
  for (let r = start.r - 2; r <= start.r + 2; r++) for (let c = start.c - 2; c <= start.c + 2; c++) {
    const n = grid[r]?.[c]; if (n) n.type = "empty";
  }
  for (let r = target.r - 2; r <= target.r + 2; r++) for (let c = target.c - 2; c <= target.c + 2; c++) {
    const n = grid[r]?.[c]; if (n) n.type = "empty";
  }
  for (let r = 0; r < rows; r++) { grid[r][0].type = "wall"; grid[r][cols - 1].type = "wall"; }
  for (let c = 0; c < cols; c++) { grid[0][c].type = "wall"; grid[rows - 1][c].type = "wall"; }
  if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay * 2));
  for (let iter = 0; iter < 4; iter++) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const next = grid.map((row) => row.map((n) => n.type));
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
      if ((r === start.r && c === start.c) || (r === target.r && c === target.c)) continue;
      let walls = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        if (grid[r + dr][c + dc].type === "wall") walls++;
      }
      if (walls > 4) next[r][c] = "wall";
      else if (walls < 4) next[r][c] = "empty";
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c].type = next[r][c] as CellNode["type"];
    if (delay > 0) await new Promise<void>((r) => setTimeout(r, delay * 2));
  }
  let wCount = 0; const wTarget = Math.floor(rows * cols * 0.06);
  for (let r = 1; r < rows - 1 && wCount < wTarget; r++) for (let c = 1; c < cols - 1 && wCount < wTarget; c++) {
    const n = grid[r][c];
    if (n.type === "empty" && Math.random() < 0.04) { n.type = "weight"; wCount++; }
  }
  grid[start.r][start.c].type = "start";
  grid[target.r][target.c].type = "target";
}
