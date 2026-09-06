import { describe, expect, it } from "vitest";
import { createRoundState, resolveRaceStatus, stepRound, type RoundState } from "../src/round.js";

describe("createRoundState", () => {
  it("starts in-progress with everything at zero", () => {
    expect(createRoundState("cat")).toEqual({
      passage: "cat",
      typed: "",
      cursorIndex: 0,
      eraseIndex: 0,
      elapsedMs: 0,
      status: "in-progress",
    });
  });
});

describe("stepRound", () => {
  it("progresses cursorIndex while typing correctly with a silent opponent", () => {
    let state = createRoundState("cat");
    state = stepRound(state, { typed: "c", opponentWpm: 0, dtMs: 500 });
    expect(state.cursorIndex).toBe(1);
    expect(state.status).toBe("in-progress");

    state = stepRound(state, { typed: "ca", opponentWpm: 0, dtMs: 500 });
    expect(state.cursorIndex).toBe(2);
    expect(state.status).toBe("in-progress");
  });

  it("wins once the full passage is confirmed-typed", () => {
    let state = createRoundState("cat");
    state = stepRound(state, { typed: "c", opponentWpm: 0, dtMs: 500 });
    state = stepRound(state, { typed: "ca", opponentWpm: 0, dtMs: 500 });
    state = stepRound(state, { typed: "cat", opponentWpm: 0, dtMs: 500 });
    expect(state.status).toBe("won");
  });

  it("doesn't lose instantly if the very first keystroke is wrong, before grace has elapsed", () => {
    let state = createRoundState("cat");
    state = stepRound(state, { typed: "x", opponentWpm: 60, dtMs: 100 });
    expect(state.cursorIndex).toBe(0);
    expect(state.eraseIndex).toBe(0);
    expect(state.status).toBe("in-progress");
  });

  it("erases even if the player never types, once the grace period elapses", () => {
    let state = createRoundState("cat");

    for (let i = 0; i < 5; i++) {
      state = stepRound(state, { typed: "", opponentWpm: 60, dtMs: 500 });
    }
    expect(state.status).toBe("in-progress");
    expect(state.eraseIndex).toBe(0);

    state = stepRound(state, { typed: "", opponentWpm: 60, dtMs: 500 });
    expect(state.eraseIndex).toBeGreaterThan(0);
    expect(state.status).toBe("lost");
  });

  it("loses once the erase index catches the cursor", () => {
    let state = createRoundState("cat");
    state = stepRound(state, { typed: "c", opponentWpm: 60, dtMs: 1000, graceMs: 0 });
    expect(state.cursorIndex).toBe(1);
    expect(state.eraseIndex).toBe(5);
    expect(state.status).toBe("lost");
  });

  it("ignores further input once a round is decided", () => {
    let state = createRoundState("cat");
    state = stepRound(state, { typed: "c", opponentWpm: 60, dtMs: 1000, graceMs: 0 });
    expect(state.status).toBe("lost");

    const after = stepRound(state, { typed: "cat", opponentWpm: 0, dtMs: 1000 });
    expect(after).toEqual(state);
  });

  it("wins rather than loses when both conditions are true in the same tick", () => {
    const state: RoundState = {
      passage: "cat",
      typed: "ca",
      cursorIndex: 2,
      eraseIndex: 1.9,
      elapsedMs: 4000,
      status: "in-progress",
    };

    const after = stepRound(state, { typed: "cat", opponentWpm: 90, dtMs: 1000 });
    expect(after.cursorIndex).toBe(3);
    expect(after.eraseIndex).toBeGreaterThanOrEqual(3);
    expect(after.status).toBe("won");
  });
});

describe("resolveRaceStatus", () => {
  const inProgress = createRoundState("cat");
  const won: RoundState = { ...inProgress, status: "won" };
  const lost: RoundState = { ...inProgress, status: "lost" };

  it("is in-progress while neither side has finished", () => {
    expect(resolveRaceStatus(inProgress, inProgress)).toBe("in-progress");
  });

  it("wins when you finish", () => {
    expect(resolveRaceStatus(won, inProgress)).toBe("won");
  });

  it("loses when the opponent finishes first", () => {
    expect(resolveRaceStatus(inProgress, won)).toBe("lost");
  });

  it("loses when you get erased", () => {
    expect(resolveRaceStatus(lost, inProgress)).toBe("lost");
  });

  it("wins when the opponent gets erased", () => {
    expect(resolveRaceStatus(inProgress, lost)).toBe("won");
  });

  it("breaks a simultaneous double-finish in your favor", () => {
    expect(resolveRaceStatus(won, won)).toBe("won");
  });

  it("breaks a simultaneous double-loss against you", () => {
    expect(resolveRaceStatus(lost, lost)).toBe("lost");
  });
});
