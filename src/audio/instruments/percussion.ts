/** Hand percussion and lounge kit pieces used by the drum kit. */
import { glide, pluck } from "../synth/envelope";
import { noiseSource } from "../synth/noise";
import { chain, filter, gain, osc, run } from "../synth/nodes";

/** The funk cowbell: two detuned squares through a band-pass. */
export function cowbell(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const band = filter(ctx, "bandpass", 2000, 0.9);
  const level = gain(ctx, 0);
  const g = level.gain;
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(vel * 0.32, t + 0.001);
  g.exponentialRampToValueAtTime(vel * 0.1, t + 0.03);
  g.exponentialRampToValueAtTime(0.0001, t + 0.3);
  chain(band, level, out);
  for (const freq of [587, 845]) {
    const tone = osc(ctx, "square", freq);
    tone.connect(band);
    run(tone, t, t + 0.32);
  }
}

export function conga(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  vel: number,
  pitch: number,
): void {
  const body = osc(ctx, "sine", pitch);
  glide(body.frequency, t, pitch * 1.25, pitch, 0.03);
  const level = gain(ctx, 0);
  const end = pluck(level.gain, t, vel * 0.55, 0.001, 0.2);
  chain(body, level, out);
  run(body, t, end);
  const slap = noiseSource(ctx, "white", t, t + 0.03);
  const slapLevel = gain(ctx, 0);
  pluck(slapLevel.gain, t, vel * 0.15, 0.0005, 0.015);
  chain(slap, filter(ctx, "bandpass", 2500, 1.2), slapLevel, out);
}

export function shaker(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  vel: number,
  alt: boolean,
): void {
  const noise = noiseSource(ctx, "white", t, t + 0.2);
  const level = gain(ctx, 0);
  pluck(level.gain, t, vel * 0.16, alt ? 0.03 : 0.012, alt ? 0.12 : 0.055);
  chain(noise, filter(ctx, "highpass", 5000), filter(ctx, "bandpass", 8500, 1), level, out);
}

/** Side-stick "tok" for the lounge bossa. */
export function rim(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const tone = osc(ctx, "triangle", 1650);
  const level = gain(ctx, 0);
  pluck(level.gain, t, vel * 0.35, 0.0005, 0.035);
  chain(tone, level, out);
  run(tone, t, t + 0.05);
  const click = noiseSource(ctx, "white", t, t + 0.03);
  const clickLevel = gain(ctx, 0);
  pluck(clickLevel.gain, t, vel * 0.25, 0.0005, 0.018);
  chain(click, filter(ctx, "bandpass", 2600, 1.5), clickLevel, out);
}

/** Brush on snare: a soft swish (alt = long sweep). */
export function brush(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  vel: number,
  alt: boolean,
): void {
  const length = alt ? 0.38 : 0.16;
  const noise = noiseSource(ctx, "white", t, t + length + 0.1);
  const band = filter(ctx, "bandpass", 3200, 0.6);
  if (alt) glide(band.frequency, t, 2200, 4200, length);
  const level = gain(ctx, 0);
  pluck(level.gain, t, vel * 0.22, alt ? 0.09 : 0.02, length);
  chain(noise, band, level, out);
}
