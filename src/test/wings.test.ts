import { describe, it, expect } from "vitest";
import { boneWeights, edgeGlyph, levels } from "@/lib/wings";

describe("wings", () => {
  it("levels curve clamps and keeps whites bright", () => {
    expect(levels(0.05, 0.08, 0.86, 0.9)).toBe(0);
    expect(levels(0.9, 0.08, 0.86, 0.9)).toBe(1);
    expect(levels(0.5, 0.08, 0.86, 0.9)).toBeGreaterThan(0.5);
  });

  it("bone weights: shoulder-only at the root, elbow then hand further out", () => {
    expect(boneWeights(0.1)).toEqual([0, 0]);
    const [e, h] = boneWeights(0.5);
    expect(e).toBe(1);
    expect(h).toBe(0);
    expect(boneWeights(0.9)).toEqual([1, 1]);
  });

  it("edge glyphs run across the gradient", () => {
    expect(edgeGlyph(1, 0)).toBe("|");
    expect(edgeGlyph(0, 1)).toBe("-");
    expect(edgeGlyph(1, -1)).toBe("/");
    expect(edgeGlyph(1, 1)).toBe("\\");
  });
});
