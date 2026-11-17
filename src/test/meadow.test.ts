import { describe, it, expect } from "vitest";
import { MEADOW_CONFIG, SPECIES, mulberry32 } from "@/lib/meadow";

describe("meadow", () => {
  it("lists the seven blue species", () => {
    expect(SPECIES).toEqual(["delphinium", "aster", "agapanthus", "thistle", "anemone", "aquilegia", "seaholly"]);
  });

  it("seeded random is stable and in range", () => {
    const a = mulberry32(MEADOW_CONFIG.seed);
    const b = mulberry32(MEADOW_CONFIG.seed);
    const xs = Array.from({ length: 50 }, () => a());
    const ys = Array.from({ length: 50 }, () => b());
    expect(xs).toEqual(ys);
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it("keeps the horizon in the upper half and the counts in their ranges", () => {
    expect(MEADOW_CONFIG.horizon).toBeCloseTo(0.42, 2);
    expect(MEADOW_CONFIG.bladesRange[0]).toBeGreaterThanOrEqual(300);
    expect(MEADOW_CONFIG.flowersRange[1]).toBeLessThanOrEqual(70);
  });
});
