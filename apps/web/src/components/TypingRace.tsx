"use client";

import { BOT_WPM, type BotDifficulty } from "game-core";
import { useEffect, useState } from "react";
import { usePvpSessionCheck } from "@/hooks/usePvpRace";
import { Match, type BestOf } from "./Match";
import { PvpRace } from "./PvpRace";
import { TypingDemo } from "./TypingDemo";

const DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard", "expert"];
const BEST_OF_OPTIONS: BestOf[] = [3, 5];

type Mode = "bot" | "pvp-host" | "pvp-join";
type AppPhase = "landing" | "bot-setup" | "match";

export function TypingRace() {
  const { checked, hasActiveMatch } = usePvpSessionCheck();
  const [mode, setMode] = useState<Mode>("bot");
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [difficulty, setDifficulty] = useState<BotDifficulty>("medium");
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [matchKey, setMatchKey] = useState(0);

  useEffect(() => {
    if (hasActiveMatch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("pvp-host");
      setPhase("match");
    }
  }, [hasActiveMatch]);

  function handleExit() {
    setMatchKey((k) => k + 1);
    setPhase("landing");
  }

  if (!checked) {
    return <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6" />;
  }

  if (phase === "match") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        {mode === "bot" ? (
          <Match key={matchKey} difficulty={difficulty} bestOf={bestOf} onExit={handleExit} />
        ) : (
          <PvpRace
            key={matchKey}
            mode={mode === "pvp-host" ? "host" : "join"}
            onExit={handleExit}
          />
        )}
      </div>
    );
  }

  if (phase === "bot-setup") {
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

        <button onClick={() => setPhase("landing")} className="text-xs text-zinc-500 underline">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6">
      <h1 className="text-7xl font-bold tracking-wide text-foreground">
        Text <span className="text-teal-500">Racers</span>
      </h1>

      <TypingDemo />

      <div className="flex flex-col items-center gap-5">
        <button
          onClick={() => {
            setMode("pvp-host");
            setPhase("match");
          }}
          className="w-80 rounded border border-zinc-700 px-6 py-4 text-xl text-foreground transition-colors duration-300 hover:border-teal-500 hover:bg-teal-500/10"
        >
          Host a new game
        </button>
        <button
          onClick={() => {
            setMode("pvp-join");
            setPhase("match");
          }}
          className="w-80 rounded border border-zinc-700 px-6 py-4 text-xl text-foreground transition-colors duration-300 hover:border-teal-500 hover:bg-teal-500/10"
        >
          Join game
        </button>
        <button
          onClick={() => {
            setMode("bot");
            setPhase("bot-setup");
          }}
          className="w-80 rounded border border-zinc-700 px-6 py-4 text-xl text-foreground transition-colors duration-300 hover:border-teal-500 hover:bg-teal-500/10"
        >
          Play against a bot
        </button>
      </div>
    </div>
  );
}
