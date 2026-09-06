"use client";

import { characterStates, type CharState } from "game-core";
import { useEffect, useRef, useState } from "react";

const PASSAGE = "the quick brown fox jumps over the lazy dog";

const STATE_CLASS: Record<CharState, string> = {
  untyped: "text-zinc-400 dark:text-zinc-600",
  correct: "text-foreground",
  error: "text-red-500",
};

export function TypingRace() {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const states = characterStates(PASSAGE, typed);

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-6 px-6"
      onClick={() => inputRef.current?.focus()}
    >
      <p className="max-w-2xl font-mono text-2xl leading-relaxed tracking-wide">
        {PASSAGE.split("").map((char, i) => (
          <span
            key={i}
            className={`${STATE_CLASS[states[i]]} ${
              i === typed.length ? "border-l-2 border-teal-500" : ""
            }`}
          >
            {char}
          </span>
        ))}
      </p>
      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="sr-only"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}
