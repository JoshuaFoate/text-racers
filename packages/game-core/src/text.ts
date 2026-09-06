export function confirmedPrefixLength(passage: string, typed: string): number {
  const limit = Math.min(passage.length, typed.length);
  let i = 0;
  while (i < limit && typed[i] === passage[i]) {
    i++;
  }
  return i;
}

export type CharState = "untyped" | "correct" | "error";

export function characterStates(passage: string, typed: string): CharState[] {
  const confirmed = confirmedPrefixLength(passage, typed);
  const states: CharState[] = new Array(passage.length);
  for (let i = 0; i < passage.length; i++) {
    if (i < confirmed) {
      states[i] = "correct";
    } else if (i < typed.length) {
      states[i] = "error";
    } else {
      states[i] = "untyped";
    }
  }
  return states;
}
