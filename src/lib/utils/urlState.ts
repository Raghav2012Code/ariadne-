import type { AlgorithmType, DifficultyType, SpeedType } from "@/store/types";

export type UrlState = {
  algo?: AlgorithmType;
  difficulty?: DifficultyType;
  speed?: SpeedType;
};

const VALID_ALGOS: AlgorithmType[] = ["astar","dijkstra","bfs","dfs","greedy","bibfs","biastar"];
const VALID_DIFFS: DifficultyType[] = ["easy","medium","hard"];
const VALID_SPEEDS: SpeedType[] = ["instant","fast","normal","slow"];

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const out: UrlState = {};
  const algo = params.get("algo") as AlgorithmType | null;
  const difficulty = params.get("difficulty") as DifficultyType | null;
  const speed = params.get("speed") as SpeedType | null;
  if (algo && (VALID_ALGOS as string[]).includes(algo)) out.algo = algo;
  if (difficulty && (VALID_DIFFS as string[]).includes(difficulty)) out.difficulty = difficulty;
  if (speed && (VALID_SPEEDS as string[]).includes(speed)) out.speed = speed;
  return out;
}

export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.algo) params.set("algo", state.algo);
  if (state.difficulty) params.set("difficulty", state.difficulty);
  if (state.speed) params.set("speed", state.speed);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function updateUrl(state: UrlState): void {
  if (typeof window === "undefined") return;
  const qs = serializeUrlState(state);
  const url = `${window.location.pathname}${qs}`;
  window.history.replaceState(null, "", url);
}
