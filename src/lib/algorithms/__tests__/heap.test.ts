import { describe, expect, it } from "vitest";
import { MinHeap } from "@/lib/algorithms/data-structures/MinHeap";

describe("MinHeap", () => {
  it("pops numbers in ascending order", () => {
    const h = new MinHeap<number>((a, b) => a - b);
    for (const v of [5, 3, 8, 1, 9, 2, 7]) h.push(v);
    const out: number[] = [];
    while (!h.isEmpty()) out.push(h.pop() as number);
    expect(out).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });

  it("peek returns the minimum without removing it", () => {
    const h = new MinHeap<number>((a, b) => a - b);
    expect(h.peek()).toBeUndefined();
    h.push(4);
    h.push(2);
    expect(h.peek()).toBe(2);
    expect(h.size()).toBe(2);
    expect(h.pop()).toBe(2);
    expect(h.peek()).toBe(4);
  });

  it("handles equal keys without losing entries", () => {
    const h = new MinHeap<string>((a, b) => a.length - b.length);
    h.push("aa");
    h.push("b");
    h.push("cc");
    expect(h.pop()).toBe("b");
    expect(h.size()).toBe(2);
  });
});
