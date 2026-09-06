"use client";

import { characterStates, type BotDifficulty, type CharState, type RoundState } from "game-core";
import { useEffect, useRef, useState } from "react";
import { useRace } from "@/hooks/useRace";

const STATE_CLASS: Record<CharState, string> = {
  untyped: "text-zinc-400 dark:text-zinc-600",
  correct: "text-foreground",
  error: "text-red-500",
};

const ERASED_CLASS = "text-zinc-600 dark:text-zinc-700 line-through decoration-red-500/70";

const COUNTDOWN_START = 3;

type Phase = "idle" | "countdown" | "racing";

function outcomeMessage(you: RoundState, botRound: RoundState): string {
  if (you.status === "won") return "You finished first!";
  if (botRound.status === "won") return "Bot finished first — you lost.";
  if (you.status === "lost") return "Erased! You lost.";
  if (botRound.status === "lost") return "Bot got erased — you won!";
  return "";
}

function PassageLine({
  passage,
  typed,
  erasedCount = 0,
}: {
  passage: string;
  typed: string;
  erasedCount?: number;
}) {
  const states = characterStates(passage, typed);
  return (
    <p className="max-w-2xl font-mono text-2xl leading-relaxed tracking-wide">
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
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs uppercase tracking-widest text-zinc-500">You</span>
        <PassageLine passage={passage} typed={typed} erasedCount={Math.floor(youRound.eraseIndex)} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-xs uppercase tracking-widest text-zinc-500">Bot ({difficulty})</span>
        <PassageLine passage={passage} typed={bot.typed} erasedCount={Math.floor(botRound.eraseIndex)} />
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
