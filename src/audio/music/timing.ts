/** Tempo grid maths: 16th-note steps with swing. */

export const STEPS_PER_BAR = 16;

export function stepDuration(bpm: number): number {
  return 60 / bpm / 4;
}

export function barDuration(bpm: number): number {
  return stepDuration(bpm) * STEPS_PER_BAR;
}

/**
 * Swing delays every off-beat 16th (odd step) by `swing` × one step.
 * 0 = straight, ≈0.33 = triplet shuffle.
 */
export function swingOffset(step: number, bpm: number, swing: number): number {
  return step % 2 === 1 ? swing * stepDuration(bpm) : 0;
}

/** Absolute time of grid step `step` for a song that started at `start`. */
export function stepTime(start: number, step: number, bpm: number, swing: number): number {
  return start + step * stepDuration(bpm) + swingOffset(step, bpm, swing);
}
