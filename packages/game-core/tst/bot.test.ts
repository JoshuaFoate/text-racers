import { describe, expect, it } from "vitest";
import { BOT_WPM, createBotState, stepBot } from "../src/bot.js";

describe("BOT_WPM", () => {
  it("matches the four fixed difficulty speeds", () => {
    expect(BOT_WPM).toEqual({ easy: 30, medium: 55, hard: 95, expert: 120 });
  });
});

describe("createBotState", () => {
  it("starts empty with the interval matching the difficulty's WPM", () => {
    const state = createBotState("expert");
    expect(state.typed).toBe("");
    expect(state.msUntilNextKeystroke).toBe(100);
  });
});

describe("stepBot", () => {
  it("advances exactly one character per keystroke interval", () => {
    let state = createBotState("expert");

    state = stepBot(state, "cat", "expert", 100);
    expect(state.typed).toBe("c");

    state = stepBot(state, "cat", "expert", 100);
    expect(state.typed).toBe("ca");

    state = stepBot(state, "cat", "expert", 100);
    expect(state.typed).toBe("cat");
  });

  it("consumes multiple characters in a single large tick", () => {
    const state = createBotState("expert");
    const next = stepBot(state, "cat", "expert", 250);
    expect(next.typed).toBe("ca");
    expect(next.msUntilNextKeystroke).toBe(50);
  });

  it("stops exactly at the end of the passage and further ticks are no-ops", () => {
    let state = createBotState("expert");
    state = stepBot(state, "cat", "expert", 1000);
    expect(state.typed).toBe("cat");

    const after = stepBot(state, "cat", "expert", 500);
    expect(after.typed).toBe("cat");
  });

  it("types faster at higher difficulties over the same elapsed time", () => {
    const easy = stepBot(createBotState("easy"), "the quick brown fox", "easy", 2000);
    const hard = stepBot(createBotState("hard"), "the quick brown fox", "hard", 2000);
    expect(hard.typed.length).toBeGreaterThan(easy.typed.length);
  });
});
