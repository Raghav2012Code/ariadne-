# AGENTS.md — ariadne (pathfinding visualizer)

Next.js 14 App Router + React 18 + TS strict + Tailwind + zustand + animejs + vitest. No CI, no pre-commit — `package.json`, `tsconfig.json`, `vitest.config.ts` are source of truth.

## Commands

- `npm run dev` / `npm run start` serve on **port 8080** (non-default). `npm run build` to verify prod build.
- `npm test` = `vitest run`. Single file: `npx vitest run src/lib/algorithms/__tests__/search.test.ts`.
- No typecheck script — use `npx tsc --noEmit`. Strict: `noUnusedLocals`, `noUnusedParameters`, `allowJs: false`.
- `npm run lint` = `next lint` (config is just `next/core-web-vitals`).
- Path alias `@/*` → `src/*` (tsconfig + vitest alias). Test env is `node`, include is `src/**/*.test.ts` only.

## Architecture

- `src/app/page.tsx` (client): `Toolbar` + `GridCanvas` + `MetricsRibbon`. On mount: `hydrateFromUrl()` → `initializeGrid()` → deferred `generateMaze()` (50ms tick so grid mounts first). `GridCanvas` is keyed by `gridVersion` — remount is the mechanism for in-place mutations.
- `src/store/useGridStore.ts` is the engine. `runSearch()` runs the algorithm **in memory with delay 0** collecting `visitedOrder`, then animates via `GridAnimator` (no per-step React re-render). `generateMaze()` diffs newly-added walls, bumps `gridVersion` + double-rAF, then animates only the diff. `executionTimeMs` is algorithm compute time only, never including animation.
- `src/lib/algorithms/search/*` signature: `(grid, start, target, signal, delay, onVisit, onFrontier, euclidean?)`. `src/lib/algorithms/maze/*`: `(grid, start, target, signal, delay)`. Weights cost 5 (`nodeCost`), walls block, 4-dir neighbors, `createGrid` forces odd rows/cols.

## Invariants (do not break)

- `GridCell` is `React.memo` comparing **only `type`+`r`+`c`**: `moveNode`/`setWall` must clone the row and the cell object (immutable update). Maze generators mutate in place, so callers must bump `gridVersion` to remount — never "fix" this by removing the remount.
- `GridAnimator` touches the DOM directly: every transition (`initializeGrid`, `clearPath`, `clearWalls`, `setAlgorithm/Difficulty/Density`, `runSearch`, `generateMaze`) must `cancelAnimation()` + `resetCellStyles()` and bump `activeAnimationToken`; long runs are guarded by `AbortController` — always thread `signal` through and handle `AbortError`.
- `moveNode`: bounds-check via `getNode` (pointer math can go OOB), reject wall destinations and opposite-anchor overlap. `setWall`: never cover anchors, ignore OOB. Maze generators must seal the outer border and preserve `start`/`target` cell types.
- Search fns must reset node search state (`parent`/`parentB`/`g`/`h`/`f`/`gB`/...) on entry — grids are reused. `bidirectionalAStar` must **not** break on first meeting; expand until `max(minF_F, minF_B) >= bestCost` plus the doubly-reached fallback scan, or weighted results go suboptimal.
- Bidirectional path reconstruction in the store joins `parent` chain + `parentB` chain at the meeting node (dedupe the joint). `onVisit`/`onFrontier` skip start/target and never downgrade `visited`.

## Tests

- Store tests run in node env: stub `globalThis.document` (`querySelectorAll`/`querySelector`/`addEventListener`/`removeEventListener`) before importing `useGridStore`, because `GridAnimator` touches the DOM.
- Search tests use `makeOpen`/`makeWeighted` (mulberry32 seeds, anchors buffered) + `traceForward`/`expectConnected`; optimality is checked vs dijkstra over seeds 1–6 — keep that seed range when touching bidirectional search.

## Conventions

- Conventional commits observed: `fix:` / `test:` / `feat:` / `chore:` / `style:`. Styling is flat dark studio (`ink` palette in `tailwind.config.ts`), no gradients.
- Never commit local noise: `.playwright-mcp/`, `next-start*.log*`, `.next/`, `*.tsbuildinfo` (`.playwright-mcp/` is not yet in `.gitignore` — leave it untracked).
