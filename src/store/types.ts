export type Point = { r: number; c: number };

export type CellType = "empty" | "wall" | "weight" | "start" | "target";
export type CellState = "unvisited" | "visited" | "frontier" | "path";

export type BrushType = "wall" | "weight" | "erase";

export interface CellNode {
  r: number;
  c: number;
  type: CellType;
  state: CellState;
  g: number;
  h: number;
  f: number;
  parent: Point | null;
  parentB: Point | null;
  gB: number;
  hB: number;
  fB: number;
}

export type AlgorithmType = "astar" | "dijkstra" | "bfs" | "dfs" | "greedy" | "bibfs" | "biastar";
export type DifficultyType = "easy" | "medium" | "hard";
export type SpeedType = "instant" | "fast" | "normal" | "slow";
export type EngineStatus = "IDLE" | "GENERATING" | "SEARCHING" | "FOUND" | "UNREACHABLE";

export type DensityPreset = { rows: number; cols: number };
export const DensityPresets: Record<string, DensityPreset> = {
  dense: { rows: 35, cols: 75 },
  balanced: { rows: 25, cols: 55 },
  spacious: { rows: 17, cols: 37 },
};

export const SpeedDelays: Record<SpeedType, number> = {
  instant: 0,
  fast: 3,
  normal: 15,
  slow: 40,
};

export interface Telemetry {
  nodesVisitedCount: number;
  pathLength: number;
  executionTimeMs: number;
}
