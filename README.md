# Ariadne — Maze Lab

Generate mazes · Visualize search · Compare algorithms.

Ariadne is an interactive pathfinding visualizer built with Next.js. Generate a maze,
pick a search algorithm, and watch it explore the grid — with live metrics
(visited nodes, path length, algorithm compute time) in the ribbon below.

## Features

- **7 search algorithms** — A\* (default), Dijkstra, BFS, DFS, Greedy Best-First,
  Bidirectional BFS, Bidirectional A\* (optimal meeting bound, not first-meeting).
- **3 maze generators by difficulty** — Easy: cellular automata · Medium: randomized
  Prim's · Hard: recursive backtracker. Borders stay sealed, start/target are preserved.
- **Weighted cells** — weight cells cost 5×, walls block movement; 4-directional grid.
- **Interactive canvas** — drag the S/T anchors, left-draw walls, right-click / Shift
  erases, Space runs the search. Clear path, clear walls, or full reset.
- **Tuning controls** — grid density (Spacious / Balanced / Dense), animation speed
  (Instant / Fast / Normal / Slow), Euclidean-distance toggle for A\*/Greedy.
- **Metrics ribbon** — algorithm, maze, status (`IDLE / SEARCHING / GENERATING /
  FOUND / UNREACHABLE`), visited/path counts, latency (pure algorithm compute time,
  excluding animation).
- **Shareable URL state** — `?algo=astar&difficulty=medium&speed=normal` restores
  the setup on load.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS ·
zustand (grid engine store) · animejs (DOM animation) · lucide-react (icons) ·
vitest (tests).

## Getting started

Prerequisites: Node.js and npm.

```bash
npm install
npm run dev     # http://localhost:8080
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run dev` / `npm run start` | Dev / prod server on **port 8080** |
| `npm run build` | Production build |
| `npm test` | Full vitest suite (31 tests, 6 files) |
| `npx vitest run <path>` | Single test file, e.g. `src/lib/algorithms/__tests__/search.test.ts` |
| `npx tsc --noEmit` | Typecheck (no dedicated script; strict incl. `noUnusedLocals`) |
| `npm run lint` | `next lint` (`next/core-web-vitals`) |

## Project structure

```
src/
  app/            # page.tsx (Toolbar + GridCanvas + MetricsRibbon), layout, globals, icon
  components/     # controls/ (Toolbar, DifficultyPicker, SpeedControl)
                  # grid/ (GridCanvas, GridCell) · metrics/ (MetricsRibbon) · ui/
  lib/
    algorithms/   # search/ (astar, dijkstra, bfs, dfs, greedy, bidirectional)
                  # maze/ (backtracker, prims, cellular) · data-structures/ (MinHeap)
    animations/   # gridAnimator.ts — DOM-level 60–120 FPS animation, no per-step re-render
    utils/        # gridHelpers (grid model, neighbors, costs), urlState (share links)
  store/          # useGridStore.ts — the engine (grid, anchors, runs, maze gen)
  types/          # animation types
```

How it works: `runSearch()` executes the algorithm in memory with zero delay,
collects the visit order, then animates it via `GridAnimator`. Maze generation diffs
newly-added walls and remounts the canvas (`gridVersion`) before animating the diff.

## Notes for contributors

- `GridCell` is memoized on `type` + coordinates only — interactive edits must
  immutably replace cell objects; maze generators mutate in place and rely on remount.
- Search and maze functions take an `AbortSignal` and must honor aborts.
- See `AGENTS.md` for the full contributor/invariant guide.
- Local-only noise (never commit): `.playwright-mcp/`, `next-start*.log*`, `.next/`, `*.tsbuildinfo`.
