"use client";

import { characterStates, type CharState } from "game-core";

const STATE_CLASS: Record<CharState, string> = {
  untyped: "text-zinc-400 dark:text-zinc-600",
  correct: "text-foreground",
  error: "text-red-500",
};

const ERASED_CLASS = "text-zinc-600 dark:text-zinc-700 line-through decoration-red-500/70";

const SIZE_CLASS = {
  lg: "text-2xl",
  sm: "text-lg",
};

export function PassageLine({
  passage,
  typed,
  erasedCount = 0,
  size = "lg",
}: {
  passage: string;
  typed: string;
  erasedCount?: number;
  size?: "lg" | "sm";
}) {
  const states = characterStates(passage, typed);
  return (
    <p className={`max-w-2xl font-mono ${SIZE_CLASS[size]} leading-relaxed tracking-wide`}>
      {passage.split("").map((char, i) => {
        const state = states[i];
        const displayChar = state === "error" && char === " " && typed[i] !== " " ? typed[i] : char;
        return (
          <span
            key={i}
            className={`${i < erasedCount ? ERASED_CLASS : STATE_CLASS[state]} ${
              i === typed.length ? "border-l-2 border-teal-500" : ""
            }`}
          >
            {displayChar}
          </span>
        );
      })}
    </p>
  );
}
