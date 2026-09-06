import { describe, expect, it } from "vitest";
import { characterStates, confirmedPrefixLength } from "../src/text.js";

describe("confirmedPrefixLength", () => {
  it("returns 0 for empty input", () => {
    expect(confirmedPrefixLength("the quick fox", "")).toBe(0);
  });

  it("returns the full length for a correct partial prefix", () => {
    expect(confirmedPrefixLength("the quick fox", "the qu")).toBe(6);
  });

  it("returns the passage length when typed matches exactly", () => {
    expect(confirmedPrefixLength("the quick fox", "the quick fox")).toBe(13);
  });

  it("stops at a single wrong character", () => {
    expect(confirmedPrefixLength("the quick fox", "the quicb")).toBe(8);
  });

  it("stays pinned at the first mismatch even if later characters typed happen to match the passage", () => {
    expect(confirmedPrefixLength("the quick fox", "the quicb fox")).toBe(8);
  });

  it("returns 0 when the very first character is wrong", () => {
    expect(confirmedPrefixLength("the quick fox", "she quick fox")).toBe(0);
  });
});

describe("characterStates", () => {
  it("marks everything untyped before typing starts", () => {
    expect(characterStates("cat", "")).toEqual(["untyped", "untyped", "untyped"]);
  });

  it("marks correctly-typed characters correct and the rest untyped", () => {
    expect(characterStates("cat", "ca")).toEqual(["correct", "correct", "untyped"]);
  });

  it("marks a mistyped character error, with nothing typed after it yet", () => {
    expect(characterStates("cat", "cx")).toEqual(["correct", "error", "untyped"]);
  });

  it("marks everything typed after a mistake as error too, even once the player keeps going", () => {
    expect(characterStates("the quick fox", "the quicb fox")).toEqual([
      "correct", "correct", "correct", "correct",
      "correct", "correct", "correct", "correct",
      "error",
      "error", "error", "error", "error",
    ]);
  });
});
