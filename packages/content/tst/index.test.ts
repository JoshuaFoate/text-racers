import { describe, expect, it } from "vitest";
import {
  generatePassage,
  PASSAGE_WORD_COUNT,
  punctuateWords,
  WORD_LIST,
} from "../src/index.js";

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("WORD_LIST", () => {
  it("has exactly 200 words", () => {
    expect(WORD_LIST.length).toBe(200);
  });

  it("is entirely lowercase with no whitespace", () => {
    for (const word of WORD_LIST) {
      expect(word).toBe(word.toLowerCase());
      expect(word).not.toMatch(/\s/);
    }
  });
});

describe("PASSAGE_WORD_COUNT", () => {
  it("matches the design's length tiers", () => {
    expect(PASSAGE_WORD_COUNT).toEqual({ short: 15, medium: 25, long: 40 });
  });
});

describe("punctuateWords", () => {
  it("capitalizes only the first word and ends with a period when no sentence break lands", () => {
    const words = ["the", "cat", "sat", "on", "mat"];
    const rng = sequenceRng([0.99]); // large target (12), never triggers a comma
    expect(punctuateWords(words, rng)).toBe("The cat sat on mat.");
  });

  it("inserts a comma mid-sentence without capitalizing or ending it", () => {
    const words = ["the", "quick", "brown", "fox", "jumps"];
    // target=12 (0.9), comma after "quick" (0.05<0.1), no more commas (0.9, 0.9)
    const rng = sequenceRng([0.9, 0.05, 0.9, 0.9]);
    expect(punctuateWords(words, rng)).toBe("The quick, brown fox jumps.");
  });

  it("breaks into a new sentence and re-capitalizes once the target is reached", () => {
    const words = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    // target=8 (0), six comma-checks all false (0.9 x6), next target=8 (0)
    const rng = sequenceRng([0, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0]);
    expect(punctuateWords(words, rng)).toBe("A b c d e f g h. I j.");
  });

  it("always capitalizes the pronoun i, even mid-sentence", () => {
    const words = ["the", "cat", "and", "i", "ran"];
    const rng = sequenceRng([0.99]); // never triggers a comma or sentence break
    expect(punctuateWords(words, rng)).toBe("The cat and I ran.");
  });

  it("never capitalizes anything beyond each sentence's first letter", () => {
    const words = Array.from({ length: 40 }, (_, i) => WORD_LIST[i % WORD_LIST.length]);
    const result = punctuateWords(words, mulberry32(7));
    for (const word of result.split(" ")) {
      const letters = word.replace(/[.,]/g, "");
      expect(letters.slice(1)).toBe(letters.slice(1).toLowerCase());
    }
  });
});

describe("generatePassage", () => {
  it("produces the exact word count for each length tier", () => {
    for (const length of ["short", "medium", "long"] as const) {
      const passage = generatePassage(length, mulberry32(1));
      const words = passage.split(" ");
      expect(words.length).toBe(PASSAGE_WORD_COUNT[length]);
    }
  });

  it("starts with a capital letter and ends with a period", () => {
    const passage = generatePassage("medium", mulberry32(2));
    expect(passage[0]).toBe(passage[0].toUpperCase());
    expect(passage.endsWith(".")).toBe(true);
  });

  it("only ever uses words from WORD_LIST", () => {
    const passage = generatePassage("long", mulberry32(3));
    for (const word of passage.split(" ")) {
      const bare = word.replace(/[.,]/g, "").toLowerCase();
      expect(WORD_LIST).toContain(bare);
    }
  });
});
