/** Synthesised room impulse response (cached per context) for the music reverb send. */
import { createRng } from "./random";

const cache = new WeakMap<BaseAudioContext, AudioBuffer>();
const SECONDS = 1.6;
const PRE_DELAY = 0.012;

export function reverbImpulse(ctx: BaseAudioContext): AudioBuffer {
  const hit = cache.get(ctx);
  if (hit) return hit;
  const length = Math.floor(ctx.sampleRate * SECONDS);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const preDelay = Math.floor(ctx.sampleRate * PRE_DELAY);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    const rng = createRng(101 + ch);
    let smooth = 0;
    for (let i = preDelay; i < length; i++) {
      const progress = (i - preDelay) / (length - preDelay);
      // Darker as the tail decays: one-pole low-pass whose coefficient grows over time.
      const damping = 0.15 + 0.7 * progress;
      smooth = smooth * damping + (rng() * 2 - 1) * (1 - damping);
      data[i] = smooth * Math.exp(-progress * 5.5) * 0.9;
    }
  }
  cache.set(ctx, buffer);
  return buffer;
}
