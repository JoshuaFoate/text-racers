"use client";

import { BOT_WPM, type BotDifficulty } from "game-core";
import { useState } from "react";
import { Match, type BestOf } from "./Match";

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "expert"];
const BEST_OF_OPTIONS: BestOf[] = [3, 5];

type AppPhase = "setup" | "match";

export function TypingRace() {
  const [phase, setPhase] = useState<AppPhase>("setup");
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [matchKey, setMatchKey] = useState(0);

  if (phase === "match") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <Match
          key={matchKey}
          difficulty={difficulty}
          bestOf={bestOf}
          onExit={() => {
            setMatchKey((k) => k + 1);
            setPhase("setup");
          }}
        />
      </div>
    );
  }

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
              {d} ({BOT_WPM[d]} WPM)
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <label htmlFor="best-of">Best of</label>
        <select
          id="best-of"
          value={bestOf}
          onChange={(e) => setBestOf(Number(e.target.value) as BestOf)}
          className="rounded border border-zinc-700 bg-transparent px-2 py-1 text-foreground"
        >
          {BEST_OF_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => setPhase("match")}
        className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
      >
        Start match
      </button>
    </div>
  );
}
