export const GAME_CORE_VERSION = "0.0.0";
export { confirmedPrefixLength, characterStates, type CharState } from "./text.js";
export { computeLiveWpm, DEFAULT_WPM_WINDOW_MS, type ProgressSample } from "./wpm.js";
export { eraseRatePerSecond, hasGraceElapsed, tickEraseIndex } from "./erase.js";
export {
  createRoundState,
  stepRound,
  resolveRaceStatus,
  type RoundState,
  type RoundStatus,
  type RoundInput,
} from "./round.js";
export {
  createBotState,
  stepBot,
  BOT_WPM,
  type BotState,
  type BotDifficulty,
} from "./bot.js";