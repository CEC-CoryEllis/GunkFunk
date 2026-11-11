/** Starts one SFX voice on any context: voice gain + stereo pan → destination. */
import type { SfxId, SfxOptions } from "../audio-types";
import { chain, gain, panner } from "../synth/nodes";
import type { Rng } from "../synth/random";
import { SFX_LEVELS } from "./levels";
import { SFX } from "./registry";
import { createSfx } from "./sfx-context";

const DEFAULT_VARIATION = 0.05;

export interface SfxVoice {
  /** Voice level; fade this to steal the voice. */
  level: GainNode;
  /** Last node of the voice; disconnect it to release everything upstream. */
  output: AudioNode;
  /** Context time at which the sound has finished. */
  end: number;
}

export function startSfx(
  ctx: BaseAudioContext,
  destination: AudioNode,
  id: SfxId,
  options: SfxOptions,
  rand: Rng,
  time: number,
): SfxVoice {
  const def = SFX[id];
  const volume = Math.max(0, Math.min(1, options.volume ?? 1)) * SFX_LEVELS[id];
  const level = gain(ctx, volume);
  const output = panner(ctx, options.pan ?? 0);
  chain(level, output, destination);
  const sfx = createSfx(
    ctx,
    level,
    time,
    options.pitch ?? 1,
    def.variation ?? DEFAULT_VARIATION,
    rand,
  );
  const length = def.recipe(sfx);
  return { level, output, end: time + length };
}
