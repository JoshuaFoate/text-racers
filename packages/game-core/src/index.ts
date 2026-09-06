export const GAME_CORE_VERSION = "0.0.0";
export { confirmedPrefixLength, characterStates, type CharState } from "./text.js";
export { computeLiveWpm, type ProgressSample } from "./wpm.js";
export { eraseRatePerSecond, hasGraceElapsed, tickEraseIndex } from "./erase.js";
export {
  createRoundState,
  stepRound,
  type RoundState,
  type RoundStatus,
  type RoundInput,
} from "./round.js";