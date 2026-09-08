"use client";

import { BOT_WPM, type BotDifficulty, type RoundState } from "game-core";
import { useEffect, useRef, useState } from "react";
import { useRace } from "@/hooks/useRace";
import { PassageLine } from "./PassageLine";

const COUNTDOWN_START = 3;

type Phase = "idle" | "countdown" | "racing";

function outcomeMessage(you: RoundState, botRound: RoundState): string {
  if (you.status === "won") return "You finished first!";
  if (botRound.status === "won") return "Bot finished first — you lost.";
  if (you.status === "lost") return "Erased! You lost.";
  if (botRound.status === "lost") return "Bot got erased — you won!";
  return "";
}

export function Race({
  passage,
  difficulty,
  onRoundEnd,
}: {
  passage: string;
  difficulty: BotDifficulty;
  onRoundEnd: (status: "won" | "lost") => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const reportedRef = useRef(false);
  const { youRound, botRound, bot, status, setTyped: setRaceTyped } = useRace(
    passage,
    difficulty,
    phase === "racing"
  );

  useEffect(() => {
    if (phase === "racing") inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown") return;

    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setPhase("racing");
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (status !== "in-progress" && !reportedRef.current) {
      reportedRef.current = true;
      onRoundEnd(status);
    }
  }, [status, onRoundEnd]);

  function handleStart() {
    setCountdown(COUNTDOWN_START);
    setPhase("countdown");
  }

  function handleChange(value: string) {
    if (status !== "in-progress") return;
    setTyped(value);
    setRaceTyped(value);
  }

  return (
    <div
      className="flex flex-col items-center gap-6"
      onClick={() => phase === "racing" && inputRef.current?.focus()}
    >
      <div className="flex flex-col items-center gap-16">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl uppercase tracking-widest text-green-500">You</span>
          <PassageLine passage={passage} typed={typed} erasedCount={Math.floor(youRound.eraseIndex)} />
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xl uppercase tracking-widest text-red-500">
            Bot ({difficulty}, {BOT_WPM[difficulty]} WPM)
          </span>
          <PassageLine
            passage={passage}
            typed={bot.typed}
            erasedCount={Math.floor(botRound.eraseIndex)}
            size="sm"
          />
        </div>
      </div>

      {phase === "idle" && (
        <button
          onClick={handleStart}
          className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
        >
          Start
        </button>
      )}

      {phase === "countdown" && <p className="text-4xl text-teal-500">{countdown}</p>}

      {phase === "racing" && status !== "in-progress" && (
        <p className={status === "won" ? "text-teal-500" : "text-red-500"}>
          {outcomeMessage(youRound, botRound)}
        </p>
      )}

      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        disabled={phase !== "racing" || status !== "in-progress"}
        className="sr-only"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}
