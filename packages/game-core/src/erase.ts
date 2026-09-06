export function eraseRatePerSecond(opponentWpm: number): number {
  return (opponentWpm * 5) / 60;
}

export function hasGraceElapsed(elapsedMs: number, graceMs = 3000): boolean {
  return elapsedMs >= graceMs;
}

export function tickEraseIndex(
  eraseIndex: number,
  opponentWpm: number,
  dtMs: number,
  isErasing: boolean
): number {
  if (!isErasing) return eraseIndex;
  return eraseIndex + eraseRatePerSecond(opponentWpm) * (dtMs / 1000);
}
