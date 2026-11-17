import { describe, it, expect } from "vitest";
import { buildWing, featherProfile } from "@/lib/wings";

describe("wings", () => {
  it("feather profile is rounded at the base and pointed at the tip", () => {
    expect(featherProfile(0)).toBe(0);
    expect(featherProfile(0.3)).toBeGreaterThan(0.8);
    expect(featherProfile(0.95)).toBeLessThan(0.3);
    expect(featherProfile(1)).toBe(0);
  });

  it("builds the full feather set for one wing", () => {
    const F = buildWing();
    const flight = F.filter((f) => f.kind === "flight");
    expect(flight).toHaveLength(10 + 13 + 6);
    expect(F.filter((f) => f.kind === "covert")).toHaveLength(2 * flight.length);
    expect(F.filter((f) => f.kind === "lesser")).toHaveLength(6 * 29);
    expect(F.filter((f) => f.kind === "scapular")).toHaveLength(10);
    // outermost primary lies nearly along the leading edge
    const outer = flight.reduce((a, b) => (b.reach > a.reach ? b : a));
    expect(Math.abs(outer.ang)).toBeLessThan(20);
  });
});
