import { describe, expect, it } from "vitest";
import {
  parseUrlState,
  serializeUrlState,
} from "@/lib/utils/urlState";

describe("urlState", () => {
  it("parses valid params and rejects invalid ones", () => {
    expect(parseUrlState("?algo=astar&difficulty=hard&speed=slow")).toEqual({
      algo: "astar",
      difficulty: "hard",
      speed: "slow",
    });
    expect(parseUrlState("?algo=nope&difficulty=hard")).toEqual({
      difficulty: "hard",
    });
    expect(parseUrlState("")).toEqual({});
  });

  it("serializes and round-trips", () => {
    const s = serializeUrlState({ algo: "bibfs", speed: "fast" });
    expect(s).toBe("?algo=bibfs&speed=fast");
    expect(parseUrlState(s)).toEqual({ algo: "bibfs", speed: "fast" });
    expect(serializeUrlState({})).toBe("");
  });
});
