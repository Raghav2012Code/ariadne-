import { describe, expect, it } from "vitest";

function stubDom(): void {
  (globalThis as Record<string, unknown>).document = {
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

describe("grid store guards", () => {
  it("moveNode never destroys the opposite anchor and rejects OOB targets", async () => {
    stubDom();
    const { useGridStore } = await import("@/store/useGridStore");
    const api = useGridStore.getState();
    api.initializeGrid(15, 15);
    let st = useGridStore.getState();
    const s0 = { ...st.startNode };
    const t0 = { ...st.targetNode };

    st.moveNode("start", { ...t0 });
    st = useGridStore.getState();
    expect(st.startNode).toEqual(s0);
    expect(st.grid[t0.r][t0.c].type).toBe("target");

    st.moveNode("target", { ...s0 });
    st = useGridStore.getState();
    expect(st.targetNode).toEqual(t0);
    expect(st.grid[s0.r][s0.c].type).toBe("start");

    expect(() => st.moveNode("start", { r: -5, c: 999 })).not.toThrow();
    st = useGridStore.getState();
    expect(st.startNode).toEqual(s0);
  });

  it("moveNode/setWall update cells and respect anchors", async () => {
    stubDom();
    const { useGridStore } = await import("@/store/useGridStore");
    const api = useGridStore.getState();
    api.initializeGrid(15, 15);
    let st = useGridStore.getState();
    const s0 = { ...st.startNode };

    st.setWall({ r: 5, c: 5 }, true);
    st = useGridStore.getState();
    expect(st.grid[5][5].type).toBe("wall");

    // cannot move onto a wall
    st.moveNode("start", { r: 5, c: 5 });
    st = useGridStore.getState();
    expect(st.startNode).toEqual(s0);

    // valid move clears the old cell
    st.setWall({ r: 5, c: 5 }, false);
    st.moveNode("start", { r: 5, c: 5 });
    st = useGridStore.getState();
    expect(st.startNode).toEqual({ r: 5, c: 5 });
    expect(st.grid[5][5].type).toBe("start");
    expect(st.grid[s0.r][s0.c].type).toBe("empty");

    // walls cannot cover anchors; OOB walls are ignored
    st.setWall({ r: 5, c: 5 }, true);
    st = useGridStore.getState();
    expect(st.grid[5][5].type).toBe("start");
    expect(() => st.setWall({ r: -1, c: -1 }, true)).not.toThrow();
  });
});
