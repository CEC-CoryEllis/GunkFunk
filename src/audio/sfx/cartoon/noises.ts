/** Noisy cartoon building blocks: bursts, whooshes, thuds, splats, bubbles, booms,
 * crackle, clangs and wood crunches. Times scale with `s.ts`, pitches with `s.p`;
 * each returns its end offset (seconds after `s.t`). */
import { glide, pluck } from "../../synth/envelope";
import { type NoiseColor, noiseSource } from "../../synth/noise";
import { chain, filter, gain, osc, run } from "../../synth/nodes";
import { fuzzCurve, shaper } from "../../synth/shaper";
import type { Sfx } from "../types";
import { tone } from "./tones";

export interface BurstOptions {
  dur: number;
  at?: number;
  gain?: number;
  attack?: number;
  color?: NoiseColor;
  type?: BiquadFilterType;
  from?: number;
  to?: number;
  q?: number;
  /** Hold level then release, instead of decaying. */
  sustain?: boolean;
  destination?: AudioNode;
}

/** Filtered noise with an optional filter sweep. */
export function burst(s: Sfx, o: BurstOptions): number {
  const start = s.t + (o.at ?? 0) * s.ts;
  const dur = o.dur * s.ts;
  const source = noiseSource(s.ctx, o.color ?? "white", start, start + dur + 0.05);
  const band = filter(s.ctx, o.type ?? "bandpass", (o.from ?? 1000) * s.p, o.q ?? 1);
  if (o.to !== undefined) glide(band.frequency, start, (o.from ?? 1000) * s.p, o.to * s.p, dur);
  const amp = gain(s.ctx, 0);
  const peak = o.gain ?? 0.5;
  const attack = (o.attack ?? 0.002) * s.ts;
  if (o.sustain) {
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(peak, start + attack);
    amp.gain.setValueAtTime(peak, Math.max(start + attack, start + dur * 0.7));
    amp.gain.linearRampToValueAtTime(0, start + dur);
  } else pluck(amp.gain, start, peak, attack, Math.max(dur - attack, 0.005));
  chain(source, band, amp, o.destination ?? s.out);
  return (o.at ?? 0) * s.ts + dur;
}

/** Air movement: a band-pass sweep that swells and fades. */
export function whoosh(
  s: Sfx,
  o: { dur: number; from: number; to: number; at?: number; gain?: number },
): number {
  return burst(s, {
    dur: o.dur,
    at: o.at,
    gain: (o.gain ?? 0.45) * 2.5,
    attack: o.dur * 0.45,
    color: "pink",
    from: o.from,
    to: o.to,
    q: 1.2,
  });
}

/** Low sine thump with a pitch drop. */
export function thud(
  s: Sfx,
  o: { from: number; to: number; dur: number; at?: number; gain?: number },
): number {
  return tone(s, {
    from: o.from,
    to: o.to,
    dur: o.dur,
    at: o.at,
    gain: o.gain ?? 0.7,
    attack: 0.002,
  });
}

/** Tiny rising sine chirps — wet bubbles. */
export function bubbles(
  s: Sfx,
  o: { count: number; spread: number; low: number; high: number; at?: number; gain?: number },
): number {
  let end = 0;
  for (let i = 0; i < o.count; i++) {
    const freq = s.range(o.low, o.high);
    end = Math.max(
      end,
      tone(s, {
        from: freq,
        to: freq * s.range(1.6, 2.4),
        dur: s.range(0.03, 0.07),
        at: (o.at ?? 0) + s.range(0, o.spread),
        gain: (o.gain ?? 0.2) * s.range(0.5, 1),
        attack: 0.003,
      }),
    );
  }
  return end;
}

/** Wet splat: falling low-pass noise, a squelchy thump and a few bubbles. */
export function splat(s: Sfx, o: { size?: number; at?: number; gain?: number } = {}): number {
  const size = o.size ?? 1;
  const level = o.gain ?? 0.6;
  const at = o.at ?? 0;
  const a = burst(s, {
    dur: 0.22 * size,
    at,
    gain: level,
    color: "pink",
    type: "lowpass",
    from: 4000,
    to: 250,
    q: 2.5,
  });
  const b = thud(s, { from: 220 / size, to: 60, dur: 0.12 * size, at, gain: level * 0.7 });
  const c = bubbles(s, {
    count: 3 + Math.round(size * 2),
    spread: 0.18 * size,
    low: 250,
    high: 700,
    at: at + 0.04,
    gain: level * 0.35,
  });
  return Math.max(a, b, c);
}

/** Random tiny noise clicks spread over time (fire crackle, debris). */
export function crackle(
  s: Sfx,
  o: { count: number; spread: number; at?: number; gain?: number; freq?: number },
): number {
  let end = 0;
  for (let i = 0; i < o.count; i++) {
    end = Math.max(
      end,
      burst(s, {
        dur: s.range(0.01, 0.035),
        at: (o.at ?? 0) + s.range(0, o.spread),
        gain: (o.gain ?? 0.3) * s.range(0.3, 1),
        from: (o.freq ?? 2500) * s.range(0.6, 1.6),
        q: 1.5,
      }),
    );
  }
  return end;
}

/** Comical explosion: distorted low boom, sub thump, crackle tail. */
export function boom(s: Sfx, o: { size?: number; at?: number; gain?: number } = {}): number {
  const size = o.size ?? 1;
  const at = o.at ?? 0;
  const level = o.gain ?? 0.7;
  const drive = shaper(s.ctx, fuzzCurve(3), "2x");
  const post = gain(s.ctx, 0.7);
  chain(drive, post, s.out);
  const a = burst(s, {
    dur: 0.9 * size,
    at,
    gain: level,
    color: "brown",
    type: "lowpass",
    from: 1800,
    to: 120,
    q: 0.8,
    destination: drive,
  });
  const b = tone(s, { from: 120, to: 30, dur: 0.6 * size, at, gain: level, destination: drive });
  const c = crackle(s, {
    count: Math.round(10 * size),
    spread: 0.6 * size,
    at: at + 0.05,
    gain: level * 0.35,
  });
  return Math.max(a, b, c);
}

const CLANG_RATIOS = [1, 2.41, 3.87, 5.33, 6.92];

/** Metallic strike: inharmonic partials with different decays. */
export function clang(
  s: Sfx,
  o: { freq: number; dur: number; at?: number; gain?: number },
): number {
  const start = s.t + (o.at ?? 0) * s.ts;
  const level = o.gain ?? 0.4;
  CLANG_RATIOS.forEach((ratio, i) => {
    const partial = osc(
      s.ctx,
      i % 2 === 0 ? "sine" : "triangle",
      o.freq * ratio * s.p * s.vary(0.01),
    );
    const amp = gain(s.ctx, 0);
    const end = pluck(amp.gain, start, level / (i + 1.5), 0.001, (o.dur * s.ts) / (1 + i * 0.4));
    chain(partial, amp, s.out);
    run(partial, start, end + 0.01);
  });
  burst(s, { dur: 0.03, at: o.at, gain: level * 0.6, from: 4000, q: 0.8 });
  return (o.at ?? 0) * s.ts + o.dur * s.ts;
}

/** Splintering wood: several band-passed snaps at random pitches. */
export function crunch(s: Sfx, o: { count: number; spread: number; at?: number; gain?: number }) {
  let end = 0;
  for (let i = 0; i < o.count; i++) {
    end = Math.max(
      end,
      burst(s, {
        dur: s.range(0.03, 0.08),
        at: (o.at ?? 0) + s.range(0, o.spread),
        gain: (o.gain ?? 0.5) * s.range(0.5, 1),
        from: s.range(500, 2200),
        q: s.range(2, 5),
        color: "pink",
      }),
    );
  }
  return end;
}
