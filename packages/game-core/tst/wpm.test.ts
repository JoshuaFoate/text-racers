import { describe, expect, it } from "vitest";
import { computeLiveWpm, type ProgressSample } from "../src/wpm.js";

describe("computeLiveWpm", () => {
  it("returns 0 for no samples", () => {
    expect(computeLiveWpm([], 0)).toBe(0);
  });

  it("returns 0 for a single sample", () => {
    const samples: ProgressSample[] = [{ cursorIndex: 5, t: 1000 }];
    expect(computeLiveWpm(samples, 4000)).toBe(0);
  });

  it("computes a basic rate over the window", () => {
    const samples: ProgressSample[] = [
      { cursorIndex: 0, t: 0 },
      { cursorIndex: 25, t: 5000 },
    ];
    expect(computeLiveWpm(samples, 5000, 5000)).toBe(60);
  });

  it("ignores progress from outside the trailing window", () => {
    const samples: ProgressSample[] = [
      { cursorIndex: 0, t: 0 },
      { cursorIndex: 50, t: 1000 },
      { cursorIndex: 55, t: 6000 },
    ];
    expect(computeLiveWpm(samples, 6000, 5000)).toBe(12);
  });

  it("decays toward zero the longer typing has stopped", () => {
    const samples: ProgressSample[] = [
      { cursorIndex: 0, t: 0 },
      { cursorIndex: 8, t: 1000 },
    ];
    expect(computeLiveWpm(samples, 3000, 5000)).toBe(32);
    expect(computeLiveWpm(samples, 6001, 5000)).toBe(0);
  });

  it("never returns a negative rate when cursorIndex regresses", () => {
    const samples: ProgressSample[] = [
      { cursorIndex: 10, t: 0 },
      { cursorIndex: 4, t: 1000 },
    ];
    expect(computeLiveWpm(samples, 1000, 5000)).toBe(0);
  });
});
