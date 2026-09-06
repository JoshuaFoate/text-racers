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
  round,
  bestOf,
  you,
  bot,
}: {
  round: number;
  bestOf: BestOf;
  you: number;
  bot: number;
}) {
  return (
    <div className="flex items-center gap-4 text-sm text-zinc-500">
      <span>Best of {bestOf}</span>
      <span>Round {round}</span>
      <span className="text-foreground">
        You {you} — {bot} Bot
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
      <Scoreboard round={round} bestOf={bestOf} you={wins.you} bot={wins.bot} />

      <Race key={round} passage={passage} difficulty={difficulty} onRoundEnd={handleRoundEnd} />

      {matchWinner === null && roundOver && (
        <button
          onClick={handleNextRound}
          className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
        >
          Next round
        </button>
      )}

      {matchWinner !== null && (
        <div className="flex flex-col items-center gap-3">
          <p className={matchWinner === "you" ? "text-teal-500" : "text-red-500"}>
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
