/** SFX recipe contract. */
import type { Rng } from "../synth/random";

/** Everything a recipe needs for one play: where, when and how to vary it. */
export interface Sfx {
  readonly ctx: BaseAudioContext;
  /** Voice input; recipes connect their output here. */
  readonly out: AudioNode;
  /** Start time on the context clock. */
  readonly t: number;
  /** Frequency multiplier: SfxOptions.pitch × per-play random variation. */
  readonly p: number;
  /** Duration multiplier (1/√p): higher pitch → slightly shorter, like a faster tape. */
  readonly ts: number;
  readonly rand: Rng;
  /** 1 ± up to `amount` (uniform). */
  vary(amount: number): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

/** Schedules the sound and returns its length in seconds (from `s.t`). */
export type SfxRecipe = (s: Sfx) => number;

export interface SfxDef {
  recipe: SfxRecipe;
  /** ± random pitch variation per play (default 0.05 = ±5 %). */
  variation?: number;
  /** Maximum overlapping voices for this id (default 4). */
  maxVoices?: number;
}
