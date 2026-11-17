import { describe, it, expect } from "vitest";
import { ASCII_IMAGE_CONFIG, boostColor, edgeChar, luminance, rampChar } from "@/lib/asciiImage";

describe("asciiImage helpers", () => {
  it("maps brightness to the density ramp", () => {
    const { ramp } = ASCII_IMAGE_CONFIG;
    expect(rampChar(ramp, 0)).toBe(" ");
    expect(rampChar(ramp, 1)).toBe("$");
    expect(ramp.indexOf(rampChar(ramp, 0.5))).toBeGreaterThan(ramp.indexOf(rampChar(ramp, 0.2)));
  });

  it("picks directional characters perpendicular to the gradient", () => {
    expect(edgeChar(1, 0)).toBe("|");
    expect(edgeChar(0, -1)).toBe("-");
    expect(edgeChar(0, 1)).toBe("_");
    expect(edgeChar(1, 1)).toBe("/");
    expect(edgeChar(1, -1)).toBe("\\");
  });

  it("boosts saturation around the mean and clamps", () => {
    const [r, g, b] = boostColor(200, 100, 100, 1.5, 1);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeLessThan(100);
    expect(b).toBeLessThan(100);
    expect(boostColor(255, 255, 255, 2, 2)).toEqual([255, 255, 255]);
  });

  it("computes luminance in 0..1", () => {
    expect(luminance(0, 0, 0)).toBe(0);
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 5);
  });
});
