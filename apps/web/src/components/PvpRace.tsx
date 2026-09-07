"use client";

import { useEffect, useRef, useState } from "react";
import { usePvpRace } from "@/hooks/usePvpRace";
import { PassageLine } from "./PassageLine";

export function PvpRace({ onExit }: { onExit: () => void }) {
  const {
    phase,
    roomCode,
    error,
    passage,
    startAt,
    you,
    opponent,
    status,
    setTyped,
    createRoom,
    joinRoom,
  } = usePvpRace();
  const [typed, setLocalTyped] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [countdownLabel, setCountdownLabel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <button
          onClick={createRoom}
          className="rounded border border-zinc-700 px-4 py-1.5 text-sm text-foreground"
        >
          Create room
        </button>

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
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs uppercase tracking-widest text-zinc-500">You</span>
        <PassageLine passage={passage} typed={typed} erasedCount={Math.floor(you.eraseIndex)} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-xs uppercase tracking-widest text-zinc-500">Opponent</span>
        <PassageLine
          passage={passage}
          typed={passage.slice(0, opponent.cursorIndex)}
          erasedCount={Math.floor(opponent.eraseIndex)}
        />
      </div>

      {phase === "countdown" && <p className="text-4xl text-teal-500">{countdownLabel}</p>}

      {phase === "done" && (
        <div className="flex flex-col items-center gap-3">
          <p className={status === "won" ? "text-teal-500" : "text-red-500"}>
            {status === "won" ? "You won!" : "You lost."}
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
