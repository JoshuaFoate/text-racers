"use client";

import { useEffect, useRef, useState } from "react";
import { type BestOf, usePvpRace } from "@/hooks/usePvpRace";
import { PassageLine } from "./PassageLine";

const BEST_OF_OPTIONS: BestOf[] = [3, 5];

export function PvpRace({ onExit }: { onExit: () => void }) {
  const {
    phase,
    roomCode,
    error,
    passage,
    startAt,
    round,
    bestOf,
    wins,
    you,
    opponent,
    status,
    opponentDisconnected,
    setTyped,
    createRoom,
    joinRoom,
  } = usePvpRace();
  const [typed, setLocalTyped] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [selectedBestOf, setSelectedBestOf] = useState<BestOf>(3);
  const [countdownLabel, setCountdownLabel] = useState(0);
  const [passageForTyped, setPassageForTyped] = useState(passage);
  const inputRef = useRef<HTMLInputElement>(null);

  if (passage !== passageForTyped) {
    setPassageForTyped(passage);
    setLocalTyped("");
  }

  useEffect(() => {
    if (phase === "racing") inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown" || startAt === null) return;
    function update() {
      setCountdownLabel(Math.max(0, Math.ceil((startAt! - Date.now()) / 1000)));
    }
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [phase, startAt]);

  function handleChange(value: string) {
    if (phase !== "racing") return;
    setLocalTyped(value);
    setTyped(value);
  }

  if (phase === "lobby") {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => createRoom(selectedBestOf)}
            className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
          >
            Create room
          </button>
          <select
            value={selectedBestOf}
            onChange={(e) => setSelectedBestOf(Number(e.target.value) as BestOf)}
            className="rounded border border-zinc-700 bg-transparent px-2 py-1 text-sm text-foreground"
          >
            {BEST_OF_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Best of {n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={5}
            className="w-28 rounded border border-zinc-700 bg-transparent px-2 py-1 text-center uppercase tracking-widest text-foreground"
          />
          <button
            onClick={() => joinRoom(codeInput)}
            className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
          >
            Join room
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button onClick={onExit} className="text-xs text-zinc-500 underline">
          Back
        </button>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-zinc-500">Share this code with your opponent</p>
        <p className="text-4xl tracking-widest text-teal-500">{roomCode}</p>
        <p className="text-sm text-zinc-500">Waiting for opponent…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="fixed left-6 top-1/2 flex -translate-y-1/2 flex-col items-start gap-2 text-xl">
        <span className="text-foreground">Best of {bestOf}</span>
        <span className="text-foreground">
          You {wins.you} — {wins.opponent} Opponent
        </span>
      </div>

      <p className="text-xl text-teal-500">Round {round}</p>

      <div className="flex flex-col items-center gap-16">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl uppercase tracking-widest text-green-500">You</span>
          <PassageLine passage={passage} typed={typed} erasedCount={Math.floor(you.eraseIndex)} />
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xl uppercase tracking-widest text-red-500">Opponent</span>
          <PassageLine
            passage={passage}
            typed={passage.slice(0, opponent.cursorIndex)}
            erasedCount={Math.floor(opponent.eraseIndex)}
            size="sm"
          />
        </div>
      </div>

      {phase === "countdown" && <p className="text-4xl text-teal-500">{countdownLabel}</p>}

      {opponentDisconnected && (phase === "countdown" || phase === "racing") && (
        <p className="text-sm text-red-500">Opponent disconnected — waiting for them to reconnect…</p>
      )}

      {phase === "round-over" && (
        <p className={status === "won" ? "text-teal-500" : "text-red-500"}>
          {status === "won" ? "You won that round!" : "You lost that round."}
        </p>
      )}

      {phase === "match-over" && (
        <div className="flex flex-col items-center gap-3">
          <p className={status === "won" ? "text-teal-500" : "text-red-500"}>
            {status === "won" ? "You won the match!" : "You lost the match."}
          </p>
          <button
            onClick={onExit}
            className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
          >
            Back to menu
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        disabled={phase !== "racing"}
        className="sr-only"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}
