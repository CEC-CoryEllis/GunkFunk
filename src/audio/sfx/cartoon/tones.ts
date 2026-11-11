/** Pitched cartoon building blocks: sweeps, boings, bells, arpeggios, slide whistles.
 * All frequencies are scaled by `s.p` and all times by `s.ts`. Each returns its end
 * offset in seconds relative to `s.t`. */
import { glide, pluck } from "../../synth/envelope";
import { chain, filter, gain, osc, run, type Wave } from "../../synth/nodes";
import { pulseWave } from "../../synth/waves";
import type { Sfx } from "../types";

export type ToneWave = Wave | "pulse25" | "pulse12";

export function resolveWave(s: Sfx, wave: ToneWave): Wave {
  if (wave === "pulse25") return pulseWave(s.ctx, 0.25);
  if (wave === "pulse12") return pulseWave(s.ctx, 0.125);
  return wave;
}

export interface ToneOptions {
  wave?: ToneWave;
  from: number;
  to?: number;
  dur: number;
  at?: number;
  gain?: number;
  attack?: number;
  /** Hold the level until the end instead of decaying (then a short release). */
  sustain?: boolean;
  /** Pitch-sweep shape (default exponential). */
  linear?: boolean;
  vibrato?: { rate: number; cents: number };
  lowpass?: number;
  bandpass?: { freq: number; q: number };
  destination?: AudioNode;
}

export function tone(s: Sfx, o: ToneOptions): number {
  const start = s.t + (o.at ?? 0) * s.ts;
  const dur = o.dur * s.ts;
  const end = start + dur;
  const source = osc(s.ctx, resolveWave(s, o.wave ?? "sine"), o.from * s.p);
  if (o.to !== undefined) {
    if (o.linear) {
      source.frequency.setValueAtTime(o.from * s.p, start);
      source.frequency.linearRampToValueAtTime(o.to * s.p, end);
    } else glide(source.frequency, start, o.from * s.p, o.to * s.p, dur);
  }
  if (o.vibrato) {
    const lfo = osc(s.ctx, "sine", o.vibrato.rate);
    const depth = gain(s.ctx, o.vibrato.cents);
    lfo.connect(depth);
    depth.connect(source.detune);
    run(lfo, start, end + 0.05);
  }
  const amp = gain(s.ctx, 0);
  const peak = o.gain ?? 0.5;
  const attack = o.attack ?? 0.004;
  if (o.sustain) {
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(peak, start + attack);
    amp.gain.setValueAtTime(peak, Math.max(start + attack, end - 0.03));
    amp.gain.linearRampToValueAtTime(0, end);
  } else pluck(amp.gain, start, peak, attack, Math.max(dur - attack, 0.005));
  const nodes: AudioNode[] = [source];
  if (o.lowpass) nodes.push(filter(s.ctx, "lowpass", o.lowpass * s.p, 1));
  if (o.bandpass) nodes.push(filter(s.ctx, "bandpass", o.bandpass.freq * s.p, o.bandpass.q));
  chain(...nodes, amp, o.destination ?? s.out);
  run(source, start, end + 0.02);
  return (o.at ?? 0) * s.ts + dur;
}

export interface BoingOptions {
  from: number;
  to?: number;
  dur: number;
  at?: number;
  gain?: number;
  /** Initial wobble depth in cents (default 600). */
  wobble?: number;
  wave?: ToneWave;
}

/** "Boyoyoyoing": a spring whose wobble slows and narrows as it settles. */
export function boing(s: Sfx, o: BoingOptions): number {
  const start = s.t + (o.at ?? 0) * s.ts;
  const dur = o.dur * s.ts;
  const end = start + dur;
  const source = osc(s.ctx, resolveWave(s, o.wave ?? "sine"), o.from * s.p);
  glide(source.frequency, start, o.from * s.p, (o.to ?? o.from * 1.6) * s.p, dur * 0.3);
  const lfo = osc(s.ctx, "sine", 16);
  lfo.frequency.setValueAtTime(18, start);
  lfo.frequency.exponentialRampToValueAtTime(6, end);
  const depth = gain(s.ctx, 0);
  depth.gain.setValueAtTime(o.wobble ?? 600, start);
  depth.gain.exponentialRampToValueAtTime(20, end);
  lfo.connect(depth);
  depth.connect(source.detune);
  const amp = gain(s.ctx, 0);
  pluck(amp.gain, start, o.gain ?? 0.5, 0.004, dur);
  chain(source, amp, s.out);
  run(source, start, end + 0.02);
  run(lfo, start, end + 0.02);
  return (o.at ?? 0) * s.ts + dur;
}

/** A struck bell / sparkle: fundamental plus inharmonic partials. */
export function bell(s: Sfx, freq: number, dur: number, level = 0.3, at = 0): number {
  const partials: [number, number][] = [
    [1, 1],
    [2.76, 0.45],
    [5.4, 0.2],
  ];
  for (const [ratio, amount] of partials) {
    tone(s, {
      from: freq * ratio,
      dur: dur / ratio ** 0.5,
      at,
      gain: level * amount,
      attack: 0.002,
    });
  }
  return at * s.ts + dur * s.ts;
}

/** Notes in sequence (Hz), each `step` seconds apart. */
export function arpeggio(
  s: Sfx,
  freqs: readonly number[],
  step: number,
  o: { wave?: ToneWave; gain?: number; noteDur?: number; at?: number } = {},
): number {
  let end = 0;
  freqs.forEach((freq, i) => {
    end = tone(s, {
      wave: o.wave ?? "pulse25",
      from: freq,
      dur: o.noteDur ?? step * 1.6,
      at: (o.at ?? 0) + i * step,
      gain: o.gain ?? 0.25,
      lowpass: 6000,
    });
  });
  return end;
}
