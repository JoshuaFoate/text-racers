"use client";

import {
  BOT_WPM,
  computeLiveWpm,
  createBotState,
  createRoundState,
  DEFAULT_WPM_WINDOW_MS,
  resolveRaceStatus,
  stepBot,
  stepRound,
  type BotDifficulty,
  type BotState,
  type ProgressSample,
  type RoundState,
} from "game-core";
import { useCallback, useEffect, useRef, useState } from "react";

type RaceState = {
  you: RoundState;
  botRound: RoundState;
  bot: BotState;
};

function createRaceState(passage: string, difficulty: BotDifficulty): RaceState {
  return {
    you: createRoundState(passage),
    botRound: createRoundState(passage),
    bot: createBotState(difficulty),
  };
}

export function useRace(passage: string, difficulty: BotDifficulty, started: boolean) {
  const [state, setState] = useState<RaceState>(() => createRaceState(passage, difficulty));
  const typedRef = useRef("");
  const lastTsRef = useRef<number | null>(null);
  const samplesRef = useRef<ProgressSample[]>([]);

  useEffect(() => {
    if (!started) return;

    let rafId: number;

    function tick(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dtMs = ts - lastTsRef.current;
      lastTsRef.current = ts;

      setState((prev) => {
        if (resolveRaceStatus(prev.you, prev.botRound) !== "in-progress") return prev;

        const you = stepRound(prev.you, {
          typed: typedRef.current,
          opponentWpm: BOT_WPM[difficulty],
          dtMs,
        });

        samplesRef.current.push({ cursorIndex: you.cursorIndex, t: ts });
        const humanWpm = computeLiveWpm(samplesRef.current, ts, DEFAULT_WPM_WINDOW_MS);

        const bot = stepBot(prev.bot, passage, difficulty, dtMs);
        const botRound = stepRound(prev.botRound, {
          typed: bot.typed,
          opponentWpm: humanWpm,
          dtMs,
        });

        return { you, botRound, bot };
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [passage, difficulty, started]);

  const setTyped = useCallback((value: string) => {
    typedRef.current = value;
  }, []);

  const status = resolveRaceStatus(state.you, state.botRound);

  return { youRound: state.you, botRound: state.botRound, bot: state.bot, status, setTyped };
}
