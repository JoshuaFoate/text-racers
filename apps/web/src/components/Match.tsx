"use client";

import { generatePassage, type PassageLength } from "content";
import type { BotDifficulty } from "game-core";
import { useMemo, useState } from "react";
import { Race } from "./Race";

export type BestOf = 3 | 5;

function lengthForRound(round: number): PassageLength {
  if (round === 1) return "short";
  if (round === 2) return "medium";
  return "long";
}

function Scoreboard({
  bestOf,
  you,
  bot,
}: {
  bestOf: BestOf;
  you: number;
  bot: number;
}) {
  return (
    <div className="fixed left-6 top-1/2 flex -translate-y-1/2 flex-col items-start gap-3 rounded border border-zinc-700 px-5 py-4 text-xl">
      <span className="font-bold text-teal-500">Best of {bestOf}</span>
      <span className="font-bold">
        <span className="text-green-500">You {you}</span>
        <span className="text-foreground"> — </span>
        <span className="text-red-500">{bot} Bot</span>
      </span>
    </div>
  );
}

export function Match({
  difficulty,
  bestOf,
  onExit,
}: {
  difficulty: BotDifficulty;
  bestOf: BestOf;
  onExit: () => void;
}) {
  const [wins, setWins] = useState({ you: 0, bot: 0 });
  const [round, setRound] = useState(1);
  const [roundOver, setRoundOver] = useState(false);
  const passage = useMemo(() => generatePassage(lengthForRound(round)), [round]);

  const winsNeeded = Math.ceil(bestOf / 2);
  const matchWinner: "you" | "bot" | null =
    wins.you >= winsNeeded ? "you" : wins.bot >= winsNeeded ? "bot" : null;

  function handleRoundEnd(status: "won" | "lost") {
    setWins((w) => (status === "won" ? { ...w, you: w.you + 1 } : { ...w, bot: w.bot + 1 }));
    setRoundOver(true);
  }

  function handleNextRound() {
    setRoundOver(false);
    setRound((r) => r + 1);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <Scoreboard bestOf={bestOf} you={wins.you} bot={wins.bot} />

      <p className="text-xl text-teal-500">Round {round}</p>

      <Race key={round} passage={passage} difficulty={difficulty} onRoundEnd={handleRoundEnd} />

      {matchWinner === null && (
        <button onClick={onExit} className="text-xs text-zinc-500 underline">
          Leave match
        </button>
      )}

      {matchWinner === null && roundOver && (
        <button
          onClick={handleNextRound}
          className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground transition-colors duration-300 hover:border-teal-500 hover:bg-teal-500/10"
        >
          Next round
        </button>
      )}

      {matchWinner !== null && (
        <div className="flex flex-col items-center gap-3">
          <p className={`text-4xl font-bold ${matchWinner === "you" ? "text-teal-500" : "text-red-500"}`}>
            {matchWinner === "you" ? "You won the match!" : "Bot won the match."}
          </p>
          <button
            onClick={onExit}
            className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
          >
            New match
          </button>
        </div>
      )}
    </div>
  );
}
