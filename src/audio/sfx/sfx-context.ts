/** Builds the per-play `Sfx` context (pitch / time scaling and randomness). */
import type { Rng } from "../synth/random";
import type { Sfx } from "./types";

export function createSfx(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  pitch: number,
  variation: number,
  rand: Rng,
): Sfx {
  const range = (min: number, max: number) => min + (max - min) * rand();
  const p = Math.max(0.25, Math.min(4, pitch)) * (1 + range(-variation, variation));
  return {
    ctx,
    out,
    t,
    p,
    ts: 1 / Math.sqrt(p),
    rand,
    vary: (amount) => 1 + range(-amount, amount),
    range,
    pick: (items) => items[Math.floor(rand() * items.length) % items.length],
  };
}
