export type BotDifficulty = "easy" | "medium" | "hard" | "expert";

export const BOT_WPM: Record<BotDifficulty, number> = {
  easy: 30,
  medium: 55,
  hard: 95,
  expert: 120,
};

export type BotState = {
  typed: string;
  msUntilNextKeystroke: number;
};

function keystrokeIntervalMs(wpm: number): number {
  const charsPerSecond = (wpm * 5) / 60;
  return 1000 / charsPerSecond;
}

export function createBotState(difficulty: BotDifficulty): BotState {
  return {
    typed: "",
    msUntilNextKeystroke: keystrokeIntervalMs(BOT_WPM[difficulty]),
  };
}

export function stepBot(
  state: BotState,
  passage: string,
  difficulty: BotDifficulty,
  dtMs: number
): BotState {
  const interval = keystrokeIntervalMs(BOT_WPM[difficulty]);
  let next = { ...state, msUntilNextKeystroke: state.msUntilNextKeystroke - dtMs };

  while (next.msUntilNextKeystroke <= 0 && next.typed.length < passage.length) {
    next = {
      typed: next.typed + passage[next.typed.length],
      msUntilNextKeystroke: next.msUntilNextKeystroke + interval,
    };
  }

  return next;
}
