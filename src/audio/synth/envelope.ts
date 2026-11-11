/** Envelope shapes applied to AudioParams (usually a GainNode's gain). */

/** Smallest value used as the target of exponential ramps (≈ -80 dB). */
const SILENCE = 0.0001;

/** Linear attack, exponential decay to silence. Returns the time it reaches silence. */
export function pluck(
  param: AudioParam,
  t: number,
  peak: number,
  attack: number,
  decay: number,
): number {
  const top = Math.max(peak, SILENCE * 2);
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(top, t + attack);
  param.exponentialRampToValueAtTime(SILENCE, t + attack + decay);
  param.setValueAtTime(0, t + attack + decay);
  return t + attack + decay;
}

export interface AdsrShape {
  attack: number;
  /** Time constant-ish duration of the fall to the sustain level. */
  decay: number;
  /** Sustain level relative to `peak` (0..1). */
  sustain: number;
  release: number;
}

/**
 * Attack → decay to sustain → hold until `noteOff` → release.
 * Returns the time the release has effectively finished (safe source stop time).
 */
export function adsr(
  param: AudioParam,
  t: number,
  peak: number,
  noteOff: number,
  shape: AdsrShape,
): number {
  const { attack, decay, sustain, release } = shape;
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + attack);
  if (sustain < 1) param.setTargetAtTime(peak * sustain, t + attack, Math.max(decay, 0.001) / 3);
  const off = Math.max(noteOff, t + attack);
  param.setTargetAtTime(0, off, Math.max(release, 0.005) / 5);
  return off + release * 1.25;
}

/** Exponential glide of a frequency param from `from` to `to`. */
export function glide(param: AudioParam, t: number, from: number, to: number, dur: number): void {
  param.setValueAtTime(Math.max(from, 1), t);
  param.exponentialRampToValueAtTime(Math.max(to, 1), t + Math.max(dur, 0.001));
}
