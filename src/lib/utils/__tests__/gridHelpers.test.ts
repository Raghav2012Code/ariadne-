import { describe, expect, it } from "vitest";
import {
  createGrid,
  getNeighbors,
  heuristic,
  nodeCost,
} from "@/lib/utils/gridHelpers";

describe("gridHelpers", () => {
  it("createGrid forces odd dimensions", () => {
    const g = createGrid(10, 12);
    expect(g.length).toBe(11);
    expect(g[0].length).toBe(13);
  });

  it("getNeighbors skips walls and stays in bounds", () => {
    const g = createGrid(5, 5);
    g[0][1].type = "wall";
    const corner = getNeighbors(g, g[0][0]);
    // (0,0): right is a wall, down is open -> 1 neighbor
    expect(corner).toHaveLength(1);
    expect(getNeighbors(g, g[2][2])).toHaveLength(4);
  });

  it("heuristic computes manhattan and euclidean distances", () => {
    expect(heuristic({ r: 0, c: 0 }, { r: 3, c: 4 })).toBe(7);
    expect(heuristic({ r: 0, c: 0 }, { r: 3, c: 4 }, true)).toBeCloseTo(5);
  });

  it("nodeCost charges 5 for weights and 1 otherwise", () => {
    const g = createGrid(3, 3);
    g[1][1].type = "weight";
    expect(nodeCost(g[1][1])).toBe(5);
    expect(nodeCost(g[0][0])).toBe(1);
  });
});
