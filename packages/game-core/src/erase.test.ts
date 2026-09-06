import { describe, expect, it } from "vitest";
import { eraseRatePerSecond, hasGraceElapsed, tickEraseIndex } from "./erase.js";

describe("eraseRatePerSecond", () => {
  it("converts WPM to chars per second", () => {
    expect(eraseRatePerSecond(60)).toBe(5);
    expect(eraseRatePerSecond(90)).toBe(7.5);
  });

  it("is 0 when the opponent isn't typing", () => {
    expect(eraseRatePerSecond(0)).toBe(0);
  });
});

describe("hasGraceElapsed", () => {
  it("is false before the grace period ends", () => {
    expect(hasGraceElapsed(2999, 3000)).toBe(false);
  });

  it("is true once the grace period ends", () => {
    expect(hasGraceElapsed(3000, 3000)).toBe(true);
    expect(hasGraceElapsed(3001, 3000)).toBe(true);
  });

  it("defaults to a 3 second grace period", () => {
    expect(hasGraceElapsed(2999)).toBe(false);
    expect(hasGraceElapsed(3000)).toBe(true);
  });
});

describe("tickEraseIndex", () => {
  it("doesn't erase while isErasing is false", () => {
    expect(tickEraseIndex(0, 60, 1000, false)).toBe(0);
  });

  it("advances by rate * dt when erasing", () => {
    expect(tickEraseIndex(0, 60, 1000, true)).toBe(5);
  });

  it("accumulates onto an existing eraseIndex", () => {
    expect(tickEraseIndex(10, 30, 500, true)).toBe(11.25);
  });

  it("doesn't erase when the opponent's WPM is 0", () => {
    expect(tickEraseIndex(5, 0, 1000, true)).toBe(5);
  });
});
