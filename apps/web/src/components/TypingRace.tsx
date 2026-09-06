"use client";

import { type BotDifficulty } from "game-core";
import { useState } from "react";
import { Race } from "./Race";

const PASSAGE = "the quick brown fox jumps over the lazy dog";

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "expert"];

export function TypingRace() {
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <label htmlFor="difficulty">Difficulty</label>
        <select
          id="difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as BotDifficulty)}
          className="rounded border border-zinc-700 bg-transparent px-2 py-1 text-foreground"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <Race key={difficulty} passage={PASSAGE} difficulty={difficulty} />
    </div>
  );
}
