/** Cartoon voices: formant-synthesised gibberish syllables, rubber-chicken squeals and a
 * distorted monster roar. Times scale with `s.ts`, pitches with `s.p`. */
import { formantBank, morphVowel, type Vowel } from "../../synth/formant";
import { type NoiseColor, noiseSource } from "../../synth/noise";
import { chain, filter, gain, osc, run } from "../../synth/nodes";
import { fuzzCurve, shaper } from "../../synth/shaper";
import type { Sfx } from "../types";
import { burst } from "./noises";
import { resolveWave, type ToneWave } from "./tones";

export type Consonant = "b" | "d" | "g" | "p" | "t" | "k" | "s" | "sh" | "m";

export interface SyllableOptions {
  f0: number;
  /** Pitch at the end relative to the start (1 = flat). */
  bend?: number;
  vowel: Vowel;
  toVowel?: Vowel;
  dur: number;
  at?: number;
  gain?: number;
  /** Formant scale: 1 = adult, >1 = small cartoon creature, <1 = huge monster. */
  shift?: number;
  consonant?: Consonant;
  wave?: ToneWave;
  /** Random pitch wobble depth in cents. */
  jitter?: number;
  /** Vocal-fry amplitude modulation rate in Hz. */
  fry?: number;
  destination?: AudioNode;
}

const PLOSIVE_BAND: Partial<Record<Consonant, number>> = {
  b: 600,
  p: 900,
  d: 2600,
  t: 4200,
  g: 1500,
  k: 2200,
};

/** One gibberish syllable: optional consonant onset, then a buzzy vowel. */
export function syllable(s: Sfx, o: SyllableOptions): number {
  const onset = consonant(s, o);
  const start = s.t + ((o.at ?? 0) + onset) * s.ts;
  const dur = o.dur * s.ts;
  const end = start + dur;
  const f0 = o.f0 * s.p;
  const source = osc(s.ctx, resolveWave(s, o.wave ?? "sawtooth"), f0);
  source.frequency.setValueAtTime(f0, start);
  source.frequency.exponentialRampToValueAtTime(f0 * (o.bend ?? 1), end);
  if (o.jitter) {
    source.detune.setValueAtTime(0, start);
    for (let time = start; time < end; time += 0.025) {
      source.detune.linearRampToValueAtTime(s.range(-o.jitter, o.jitter), time);
    }
  }
  const shift = (o.shift ?? 1) * Math.sqrt(s.p);
  const bank = formantBank(s.ctx, o.vowel, shift);
  if (o.toVowel) morphVowel(bank, o.toVowel, start + dur * 0.2, dur * 0.6, shift);
  const amp = gain(s.ctx, 0);
  const peak = o.gain ?? 0.5;
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(peak, start + Math.min(0.015, dur * 0.3));
  amp.gain.setValueAtTime(peak, Math.max(start + 0.015, end - 0.04));
  amp.gain.linearRampToValueAtTime(0, end);
  chain(source, bank.input);
  if (o.fry) {
    const fry = gain(s.ctx, 0.55);
    const lfo = osc(s.ctx, "square", o.fry);
    const fryDepth = gain(s.ctx, 0.45);
    lfo.connect(fryDepth);
    fryDepth.connect(fry.gain);
    chain(bank.output, fry, amp, o.destination ?? s.out);
    run(lfo, start, end + 0.02);
  } else chain(bank.output, amp, o.destination ?? s.out);
  run(source, start, end + 0.02);
  return (o.at ?? 0) * s.ts + onset * s.ts + dur;
}

/** Schedules the consonant onset; returns how long it delays the vowel. */
function consonant(s: Sfx, o: SyllableOptions): number {
  if (!o.consonant) return 0;
  const level = (o.gain ?? 0.5) * 0.5;
  const at = o.at ?? 0;
  const plosive = PLOSIVE_BAND[o.consonant];
  if (plosive) {
    burst(s, { dur: 0.018, at, gain: level, from: plosive, q: 1.2, destination: o.destination });
    return 0.012;
  }
  if (o.consonant === "m") {
    const hum = osc(s.ctx, "sine", o.f0 * s.p);
    const amp = gain(s.ctx, 0);
    const start = s.t + at * s.ts;
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(level, start + 0.01);
    amp.gain.linearRampToValueAtTime(0, start + 0.05 * s.ts);
    chain(hum, filter(s.ctx, "lowpass", 500), amp, o.destination ?? s.out);
    run(hum, start, start + 0.06);
    return 0.035;
  }
  const hiss = o.consonant === "s" ? 6000 : 2800;
  burst(s, { dur: 0.06, at, gain: level * 0.7, from: hiss, q: 1.5, attack: 0.02 });
  return 0.05;
}

/** Rubber chicken: a nasal reed squeal with a raspy flutter, a goofy wobble and a puff of air. */
export function squeal(
  s: Sfx,
  o: { from: number; peak: number; to: number; dur: number; at?: number; gain?: number },
): number {
  const start = s.t + (o.at ?? 0) * s.ts;
  const dur = o.dur * s.ts;
  const end = start + dur;
  const source = osc(s.ctx, resolveWave(s, "pulse12"), o.from * s.p);
  source.frequency.setValueAtTime(o.from * s.p, start);
  source.frequency.exponentialRampToValueAtTime(o.peak * s.p, start + dur * 0.18);
  source.frequency.exponentialRampToValueAtTime(o.to * s.p, end);
  const stopModulators: OscillatorNode[] = [];
  for (const [rate, cents] of [
    [23, 35],
    [7, 70],
  ] as const) {
    const lfo = osc(s.ctx, "sine", rate);
    const depth = gain(s.ctx, cents);
    lfo.connect(depth);
    depth.connect(source.detune);
    stopModulators.push(lfo);
  }
  const bank = formantBank(s.ctx, "ae", 1.4);
  const amp = gain(s.ctx, 0);
  const peak = o.gain ?? 0.45;
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(peak, start + 0.015);
  amp.gain.linearRampToValueAtTime(peak * 0.75, end - 0.05);
  amp.gain.linearRampToValueAtTime(0, end);
  chain(source, bank.input);
  chain(bank.output, amp, s.out);
  chain(source, gain(s.ctx, 0.3), filter(s.ctx, "highpass", 1200), amp);
  run(source, start, end + 0.02);
  for (const lfo of stopModulators) run(lfo, start, end + 0.02);
  burst(s, { dur: o.dur, at: o.at, gain: peak * 0.07, from: 3200, q: 0.9, sustain: true });
  return (o.at ?? 0) * s.ts + dur;
}

/** Distorted monster voice: buzzy formant growl + rumbling noise into a fuzz box. */
export function roar(s: Sfx, o: { f0: number; dur: number; at?: number; gain?: number }): number {
  const start = s.t + (o.at ?? 0) * s.ts;
  const dur = o.dur * s.ts;
  const end = start + dur;
  const fuzz = shaper(s.ctx, fuzzCurve(6), "4x");
  const amp = gain(s.ctx, 0);
  const peak = o.gain ?? 0.5;
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(peak, start + 0.08);
  amp.gain.setValueAtTime(peak, start + dur * 0.6);
  amp.gain.linearRampToValueAtTime(0, end);
  chain(fuzz, filter(s.ctx, "lowpass", 3200, 0.8), amp, s.out);
  for (const voice of [
    { vowel: "a" as const, to: "o" as const, f0: o.f0, wave: "sawtooth" as const },
    { vowel: "uh" as const, to: "u" as const, f0: o.f0 * 1.5, wave: "square" as const },
  ]) {
    syllable(s, {
      f0: voice.f0,
      bend: 0.75,
      vowel: voice.vowel,
      toVowel: voice.to,
      dur: o.dur,
      at: o.at,
      gain: 0.9,
      shift: 0.75,
      wave: voice.wave,
      jitter: 60,
      destination: fuzz,
    });
  }
  growl(s, start, end, fuzz, "brown");
  return (o.at ?? 0) * s.ts + dur;
}

function growl(s: Sfx, start: number, end: number, out: AudioNode, color: NoiseColor): void {
  const noise = noiseSource(s.ctx, color, start, end);
  const throat = gain(s.ctx, 0.6);
  const lfo = osc(s.ctx, "sine", 27);
  const depth = gain(s.ctx, 0.5);
  lfo.connect(depth);
  depth.connect(throat.gain);
  chain(noise, filter(s.ctx, "bandpass", 380 * s.p, 1.2), throat, out);
  run(lfo, start, end);
}
