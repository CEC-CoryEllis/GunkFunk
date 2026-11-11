/**
 * Synthesised funk drum kit: pitch-drop kick, noise + body snare (ghost-note aware),
 * closed / open hats with choke, clap, toms and a metallic crash. Hand percussion
 * lives in `percussion.ts`.
 */
import { glide, pluck } from "../synth/envelope";
import { noiseSource } from "../synth/noise";
import { chain, filter, gain, osc, run } from "../synth/nodes";
import { brush, conga, cowbell, rim, shaker } from "./percussion";
import type { DrumKit, DrumVoice } from "./types";

type VoiceFn = (
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  vel: number,
  alt: boolean,
) => void;

export function createDrumKit(ctx: BaseAudioContext, out: AudioNode): DrumKit {
  const bus = gain(ctx, 1);
  bus.connect(out);
  let openHatChoke: GainNode | null = null;

  const voices: Record<DrumVoice, VoiceFn> = {
    kick,
    snare,
    hat: (c, o, t, vel, alt) => {
      if (alt) openHatChoke = openHat(c, o, t, vel);
      else closedHat(c, o, t, vel);
    },
    clap,
    tom: (c, o, t, vel) => tom(c, o, t, vel, 210),
    tomLo: (c, o, t, vel) => tom(c, o, t, vel, 130),
    crash,
    cowbell,
    conga: (c, o, t, vel, alt) => conga(c, o, t, vel, alt ? 420 : 330),
    congaLo: (c, o, t, vel) => conga(c, o, t, vel, 230),
    shaker,
    rim,
    brush,
  };

  return {
    hit(t, voice, vel, alt) {
      if (voice === "hat" && openHatChoke) {
        openHatChoke.gain.setTargetAtTime(0, t, 0.012);
        openHatChoke = null;
      }
      voices[voice](ctx, bus, t, vel, alt);
    },
  };
}

function kick(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const body = osc(ctx, "sine", 160);
  body.frequency.setValueAtTime(165, t);
  body.frequency.exponentialRampToValueAtTime(55, t + 0.07);
  body.frequency.exponentialRampToValueAtTime(42, t + 0.4);
  const level = gain(ctx, 0);
  const end = pluck(level.gain, t, vel * 1.05, 0.002, 0.42);
  chain(body, level, out);
  run(body, t, end);
  // Beater click so the kick reads on small speakers.
  const click = osc(ctx, "square", 1100);
  glide(click.frequency, t, 1100, 300, 0.012);
  const clickLevel = gain(ctx, 0);
  pluck(clickLevel.gain, t, vel * 0.12, 0.0005, 0.014);
  chain(click, filter(ctx, "lowpass", 3000), clickLevel, out);
  run(click, t, t + 0.03);
}

function snare(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const ghost = vel < 0.45;
  const noise = noiseSource(ctx, "white", t, t + 0.3);
  const hp = filter(ctx, "highpass", 1100, 0.7);
  const sizzle = filter(ctx, "peaking", 5200, 0.8, 5);
  const noiseLevel = gain(ctx, 0);
  pluck(noiseLevel.gain, t, vel * 0.62, 0.001, ghost ? 0.07 : 0.2);
  chain(noise, hp, sizzle, noiseLevel, out);

  const body = osc(ctx, "triangle", 210);
  glide(body.frequency, t, 230, 170, 0.05);
  const bodyLevel = gain(ctx, 0);
  const end = pluck(bodyLevel.gain, t, vel * 0.6, 0.001, ghost ? 0.05 : 0.1);
  chain(body, bodyLevel, out);
  run(body, t, end);
}

function closedHat(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const noise = noiseSource(ctx, "white", t, t + 0.08);
  const level = gain(ctx, 0);
  pluck(level.gain, t, vel * 0.3, 0.001, 0.045);
  chain(noise, filter(ctx, "highpass", 7000), filter(ctx, "bandpass", 10000, 0.9), level, out);
}

/** Returns a choke gain so the next closed hat can cut the open hat off. */
function openHat(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): GainNode {
  const noise = noiseSource(ctx, "white", t, t + 0.5);
  const level = gain(ctx, 0);
  pluck(level.gain, t, vel * 0.26, 0.002, 0.36);
  const choke = gain(ctx, 1);
  chain(
    noise,
    filter(ctx, "highpass", 6500),
    filter(ctx, "bandpass", 9000, 0.7),
    level,
    choke,
    out,
  );
  return choke;
}

function clap(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const noise = noiseSource(ctx, "white", t, t + 0.3);
  const band = filter(ctx, "bandpass", 1150, 1.4);
  const level = gain(ctx, 0);
  const g = level.gain;
  g.setValueAtTime(0, t);
  for (let i = 0; i < 3; i++) {
    const ti = t + i * 0.011;
    g.setValueAtTime(vel * 0.75, ti);
    g.exponentialRampToValueAtTime(vel * 0.08, ti + 0.009);
  }
  g.setValueAtTime(vel * 0.6, t + 0.033);
  g.exponentialRampToValueAtTime(0.0001, t + 0.2);
  chain(noise, band, filter(ctx, "highpass", 600), level, out);
}

function tom(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number, pitch: number) {
  const body = osc(ctx, "sine", pitch);
  glide(body.frequency, t, pitch * 1.35, pitch, 0.08);
  const level = gain(ctx, 0);
  const end = pluck(level.gain, t, vel * 0.8, 0.002, 0.3);
  chain(body, level, out);
  run(body, t, end);
  const noise = noiseSource(ctx, "pink", t, t + 0.05);
  const noiseLevel = gain(ctx, 0);
  pluck(noiseLevel.gain, t, vel * 0.2, 0.001, 0.03);
  chain(noise, filter(ctx, "bandpass", pitch * 6, 1), noiseLevel, out);
}

const CRASH_RATIOS = [1, 1.52, 1.6, 1.8, 2.23, 3.21];

function crash(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const end = t + 1.8;
  const noise = noiseSource(ctx, "white", t, end);
  const noiseLevel = gain(ctx, 0);
  pluck(noiseLevel.gain, t, vel * 0.3, 0.002, 1.6);
  chain(noise, filter(ctx, "highpass", 4200), noiseLevel, out);
  // Inharmonic square cluster for the metallic shimmer.
  const metal = gain(ctx, 0);
  pluck(metal.gain, t, vel * 0.12, 0.002, 1.2);
  const band = filter(ctx, "bandpass", 8000, 0.6);
  chain(band, filter(ctx, "highpass", 5500), metal, out);
  for (const ratio of CRASH_RATIOS) {
    const partial = osc(ctx, "square", 300 * ratio);
    partial.connect(band);
    run(partial, t, end);
  }
}
