"use client";

import { confirmedPrefixLength, type RoundStatus } from "game-core";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

const PROGRESS_INTERVAL_MS = 150;

export type ClientRound = { cursorIndex: number; eraseIndex: number; status: RoundStatus };

export type PvpPhase = "lobby" | "waiting" | "countdown" | "racing" | "done";

const EMPTY_ROUND: ClientRound = { cursorIndex: 0, eraseIndex: 0, status: "in-progress" };

export function usePvpRace() {
  const [phase, setPhase] = useState<PvpPhase>("lobby");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passage, setPassage] = useState("");
  const [startAt, setStartAt] = useState<number | null>(null);
  const [you, setYou] = useState<ClientRound>(EMPTY_ROUND);
  const [opponent, setOpponent] = useState<ClientRound>(EMPTY_ROUND);
  const [status, setStatus] = useState<RoundStatus>("in-progress");
  const typedRef = useRef("");

  useEffect(() => {
    const socket = getSocket();

    function handleMatchStart(payload: { passage: string; startAt: number }) {
      setPassage(payload.passage);
      setStartAt(payload.startAt);
      setPhase("countdown");
    }
    function handleState(payload: { you: ClientRound; opponent: ClientRound }) {
      setYou(payload.you);
      setOpponent(payload.opponent);
    }
    function handleRoundOver(payload: { status: RoundStatus }) {
      setStatus(payload.status);
      setPhase("done");
    }

    socket.on("match-start", handleMatchStart);
    socket.on("state", handleState);
    socket.on("round-over", handleRoundOver);

    return () => {
      socket.off("match-start", handleMatchStart);
      socket.off("state", handleState);
      socket.off("round-over", handleRoundOver);
    };
  }, []);

  useEffect(() => {
    if (phase !== "countdown" || startAt === null) return;
    const msUntilStart = startAt - Date.now();
    const timer = setTimeout(() => setPhase("racing"), Math.max(0, msUntilStart));
    return () => clearTimeout(timer);
  }, [phase, startAt]);

  useEffect(() => {
    if (phase !== "racing") return;
    const socket = getSocket();
    const interval = setInterval(() => {
      const cursorIndex = confirmedPrefixLength(passage, typedRef.current);
      socket.emit("progress", { cursorIndex });
    }, PROGRESS_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase, passage]);

  const createRoom = useCallback(() => {
    setError(null);
    getSocket().emit("create-room", (res: { roomCode: string }) => {
      setRoomCode(res.roomCode);
      setPhase("waiting");
    });
  }, []);

  const joinRoom = useCallback((code: string) => {
    setError(null);
    getSocket().emit(
      "join-room",
      { roomCode: code },
      (res: { ok: boolean; error?: string }) => {
        if (!res.ok) {
          setError(res.error ?? "Could not join room");
          return;
        }
        setRoomCode(code);
        setPhase("waiting");
      }
    );
  }, []);

  const setTyped = useCallback((value: string) => {
    typedRef.current = value;
  }, []);

  return {
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
  };
}
