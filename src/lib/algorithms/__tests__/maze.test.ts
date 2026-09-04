import { describe, expect, it } from "vitest";
import { createGrid } from "@/lib/utils/gridHelpers";
import { recursiveBacktracker } from "@/lib/algorithms/maze/backtracker";
import { randomizedPrims } from "@/lib/algorithms/maze/prims";
import { cellularAutomata } from "@/lib/algorithms/maze/cellular";

const sig = () => new AbortController().signal;

describe("maze generators", () => {
  const gens = {
    backtracker: recursiveBacktracker,
    prims: randomizedPrims,
    cellular: cellularAutomata,
  };
  for (const [name, gen] of Object.entries(gens)) {
    it(`${name} seals the outer border and preserves anchors`, async () => {
      for (let run = 0; run < 10; run++) {
        const grid = createGrid(25, 25);
        const start = { r: 1, c: 1 };
        const target = { r: grid.length - 2, c: grid[0].length - 2 };
        await gen(grid, start, target, sig(), 0);
        for (let c = 0; c < grid[0].length; c++) {
          expect(grid[0][c].type).toBe("wall");
          expect(grid[grid.length - 1][c].type).toBe("wall");
        }
        for (let r = 0; r < grid.length; r++) {
          expect(grid[r][0].type).toBe("wall");
          expect(grid[r][grid[0].length - 1].type).toBe("wall");
        }
        expect(grid[start.r][start.c].type).toBe("start");
        expect(grid[target.r][target.c].type).toBe("target");
      }
    });
  }
});
