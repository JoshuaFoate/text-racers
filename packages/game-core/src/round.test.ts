import { describe, expect, it } from "vitest";
import { createRoundState, stepRound, type RoundState } from "./round.js";

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
