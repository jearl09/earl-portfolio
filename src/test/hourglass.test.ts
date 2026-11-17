import { describe, it, expect } from "vitest";
import { BULB_VOLUME, levelForVolume, profile } from "@/lib/hourglass";

describe("hourglass geometry", () => {
  it("profile is narrow at the neck, widest in the bulb, narrower at the cap", () => {
    expect(profile(0)).toBeLessThan(0.1);
    expect(profile(0.55)).toBeGreaterThan(0.38);
    expect(profile(0.95)).toBeLessThan(profile(0.55));
  });

  it("volume lookup is monotonic and conserves sand", () => {
    const quarter = levelForVolume(BULB_VOLUME * 0.25);
    const half = levelForVolume(BULB_VOLUME * 0.5);
    const full = levelForVolume(BULB_VOLUME);
    expect(quarter).toBeGreaterThan(0);
    expect(half).toBeGreaterThan(quarter);
    expect(full).toBeCloseTo(0.95, 3);
    // the bulb is wide near the top, so half the volume sits well above half the height
    expect(half).toBeGreaterThan(0.95 * 0.5);
  });
});
