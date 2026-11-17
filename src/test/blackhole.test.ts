import { describe, it, expect } from "vitest";
import { fieldAt, paletteColor, pnoise, type FieldOptions } from "@/lib/blackhole";

const opts: FieldOptions = { diskInner: 1.28, diskOuter: 5.6, tilt: 0.21, rotationSpeed: 0.5, doppler: 0.45 };

describe("blackhole field", () => {
  it("is black inside the event horizon away from the near disk", () => {
    expect(fieldAt(0, 0, 0, opts)).toBe(0);
    expect(fieldAt(0, -0.5, 0, opts)).toBe(0);
  });

  it("lights the near disk, the photon ring and the lensed far side", () => {
    expect(fieldAt(2.5, 0.2, 0, opts)).toBeGreaterThan(0); // front disk
    expect(fieldAt(0, 1.04, 0, opts)).toBeGreaterThan(0.5); // ring
    expect(fieldAt(0, -1.3, 0, opts)).toBeGreaterThan(0); // top arc
  });

  it("beams the approaching side brighter than the receding side", () => {
    expect(fieldAt(-2.5, 0.1, 0, opts)).toBeGreaterThan(fieldAt(2.5, 0.1, 0, opts));
  });

  it("is empty far outside the disk", () => {
    expect(fieldAt(7, 3, 0, opts)).toBe(0);
  });
});

describe("blackhole helpers", () => {
  it("palette brightens from fringe to core", () => {
    const dim = paletteColor("fire", 0);
    const hot = paletteColor("fire", 1);
    expect(hot[0] + hot[1] + hot[2]).toBeGreaterThan(dim[0] + dim[1] + dim[2]);
    expect(paletteColor("ice", 1)[2]).toBeGreaterThan(200);
  });

  it("noise is periodic around the circle", () => {
    expect(pnoise(2.37, 0.4, 10)).toBeCloseTo(pnoise(2.37, 10.4, 10), 10);
  });
});
