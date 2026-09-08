"use client";

import { confirmedPrefixLength, type RoundStatus } from "game-core";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

const PROGRESS_INTERVAL_MS = 150;
const SESSION_STORAGE_KEY = "text-racers-session-id";
const SESSION_CHECK_TIMEOUT_MS = 3000;

export type ClientRound = { cursorIndex: number; eraseIndex: number; status: RoundStatus };
export type BestOf = 3 | 5;

export type PvpPhase = "lobby" | "waiting" | "countdown" | "racing" | "round-over" | "match-over";

const EMPTY_ROUND: ClientRound = { cursorIndex: 0, eraseIndex: 0, status: "in-progress" };

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_STORAGE_KEY);
}

export function usePvpSessionCheck(): { checked: boolean; hasActiveMatch: boolean } {
  const [checked, setChecked] = useState(false);
  const [hasActiveMatch, setHasActiveMatch] = useState(false);

  useEffect(() => {
    const existingSessionId = getStoredSessionId();
    if (!existingSessionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true);
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      setChecked(true);
    }, SESSION_CHECK_TIMEOUT_MS);

    getSocket().emit(
      "reconnect-session",
      { sessionId: existingSessionId },
      (res: { ok: boolean; passage?: string }) => {
        if (settled) return;
        clearTimeout(timeout);
        setHasActiveMatch(Boolean(res.ok && res.passage));
        setChecked(true);
      }
    );

    return () => clearTimeout(timeout);
  }, []);

  return { checked, hasActiveMatch };
}

export function usePvpRace() {
  const [phase, setPhase] = useState<PvpPhase>("lobby");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passage, setPassage] = useState("");
  const [startAt, setStartAt] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [wins, setWins] = useState({ you: 0, opponent: 0 });
  const [you, setYou] = useState<ClientRound>(EMPTY_ROUND);
  const [opponent, setOpponent] = useState<ClientRound>(EMPTY_ROUND);
  const [status, setStatus] = useState<RoundStatus>("in-progress");
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const typedRef = useRef("");
  const sessionIdRef = useRef("");

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    const socket = getSocket();

    function handleMatchStart(payload: {
      passage: string;
      startAt: number;
      round: number;
      bestOf: BestOf;
      wins: { you: number; opponent: number };
    }) {
      setPassage(payload.passage);
      setStartAt(payload.startAt);
      setRound(payload.round);
      setBestOf(payload.bestOf);
      setWins(payload.wins);
      setYou(EMPTY_ROUND);
      setOpponent(EMPTY_ROUND);
      setOpponentDisconnected(false);
      setPhase("countdown");
    }
    function handleState(payload: { you: ClientRound; opponent: ClientRound }) {
      setYou(payload.you);
      setOpponent(payload.opponent);
    }
    function handleRoundOver(payload: {
      status: RoundStatus;
      wins: { you: number; opponent: number };
      matchOver: boolean;
    }) {
      setStatus(payload.status);
      setWins(payload.wins);
      setPhase(payload.matchOver ? "match-over" : "round-over");
    }
    function handleOpponentDisconnected() {
      setOpponentDisconnected(true);
    }
    function handleOpponentReconnected() {
      setOpponentDisconnected(false);
    }
    function handleOpponentLeft() {
      setOpponentLeft(true);
    }

    socket.on("match-start", handleMatchStart);
    socket.on("state", handleState);
    socket.on("round-over", handleRoundOver);
    socket.on("opponent-disconnected", handleOpponentDisconnected);
    socket.on("opponent-reconnected", handleOpponentReconnected);
    socket.on("opponent-left", handleOpponentLeft);

    // Always attempt to resume a previous session first - this is what makes
    // a page refresh (not just a brief network blip) recoverable, not only
    // an in-page reconnect.
    socket.emit(
      "reconnect-session",
      { sessionId: sessionIdRef.current },
      (res: {
        ok: boolean;
        passage?: string;
        round?: number;
        bestOf?: BestOf;
        wins?: { you: number; opponent: number };
        you?: ClientRound;
        opponent?: ClientRound;
      }) => {
        if (!res.ok || !res.passage) return;
        setPassage(res.passage);
        setRound(res.round ?? 1);
        setBestOf(res.bestOf ?? 3);
        setWins(res.wins ?? { you: 0, opponent: 0 });
        setYou(res.you ?? EMPTY_ROUND);
        setOpponent(res.opponent ?? EMPTY_ROUND);
        setPhase("racing");
      }
    );

    return () => {
      socket.off("match-start", handleMatchStart);
      socket.off("state", handleState);
      socket.off("round-over", handleRoundOver);
      socket.off("opponent-disconnected", handleOpponentDisconnected);
      socket.off("opponent-reconnected", handleOpponentReconnected);
      socket.off("opponent-left", handleOpponentLeft);
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

  const createRoom = useCallback((selectedBestOf: BestOf) => {
    setError(null);
    getSocket().emit(
      "create-room",
      { sessionId: sessionIdRef.current, bestOf: selectedBestOf },
      (res: { roomCode: string }) => {
        setRoomCode(res.roomCode);
        setPhase("waiting");
      }
    );
  }, []);

  const joinRoom = useCallback((code: string) => {
    setError(null);
    getSocket().emit(
      "join-room",
      { sessionId: sessionIdRef.current, roomCode: code },
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

  const leaveMatch = useCallback(() => {
    getSocket().emit("leave-match");
  }, []);

  return {
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
    opponentLeft,
    setTyped,
    createRoom,
    joinRoom,
    leaveMatch,
  };
}
