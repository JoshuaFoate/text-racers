export type ProgressSample = { cursorIndex: number; t: number };

export const DEFAULT_WPM_WINDOW_MS = 5000;

export function computeLiveWpm(
  samples: ProgressSample[],
  now: number,
  windowMs = DEFAULT_WPM_WINDOW_MS
): number {
  if (samples.length === 0) return 0;

  const windowStart = now - windowMs;
  const latestCursor = samples[samples.length - 1].cursorIndex;

  let baseline = samples[0];
  for (const sample of samples) {
    if (sample.t > windowStart) break;
    baseline = sample;
  }

  const elapsedMs = now - baseline.t;
  if (elapsedMs <= 0) return 0;

  const charsGained = Math.max(0, latestCursor - baseline.cursorIndex);
  return charsGained / 5 / (elapsedMs / 60000);
}
