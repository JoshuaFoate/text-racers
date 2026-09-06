import { hasGraceElapsed, tickEraseIndex } from "./erase.js";
import { confirmedPrefixLength } from "./text.js";

export type RoundStatus = "in-progress" | "won" | "lost";

export type RoundState = {
  passage: string;
  typed: string;
  cursorIndex: number;
  eraseIndex: number;
  elapsedMs: number;
  status: RoundStatus;
};

export type RoundInput = {
  typed: string;
  opponentWpm: number;
  dtMs: number;
  graceMs?: number;
};

export function createRoundState(passage: string): RoundState {
  return {
    passage,
    typed: "",
    cursorIndex: 0,
    eraseIndex: 0,
    elapsedMs: 0,
    status: "in-progress",
  };
}

export function stepRound(state: RoundState, input: RoundInput): RoundState {
  if (state.status !== "in-progress") return state;

  const cursorIndex = confirmedPrefixLength(state.passage, input.typed);
  const elapsedMs = state.elapsedMs + input.dtMs;
  const isErasing = hasGraceElapsed(elapsedMs, input.graceMs);
  const eraseIndex = tickEraseIndex(state.eraseIndex, input.opponentWpm, input.dtMs, isErasing);

  let status: RoundStatus = "in-progress";
  if (cursorIndex >= state.passage.length) {
    status = "won";
  } else if (eraseIndex > 0 && eraseIndex >= cursorIndex) {
    status = "lost";
  }

  return {
    passage: state.passage,
    typed: input.typed,
    cursorIndex,
    eraseIndex,
    elapsedMs,
    status,
  };
}

export function resolveRaceStatus(you: RoundState, opponent: RoundState): RoundStatus {
  if (you.status === "won") return "won";
  if (opponent.status === "won") return "lost";
  if (you.status === "lost") return "lost";
  if (opponent.status === "lost") return "won";
  return "in-progress";
}
