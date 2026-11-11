/** Interactive / destructible world objects and collectibles. */
import {
  boom,
  bubbles,
  burst,
  clang,
  crackle,
  crunch,
  splat,
  thud,
  whoosh,
} from "../cartoon/noises";
import { arpeggio, bell, boing, tone } from "../cartoon/tones";
import { syllable } from "../cartoon/voices";
import type { SfxId } from "../../audio-types";
import type { SfxDef } from "../types";

export const ENVIRONMENT_SFX = {
  /** Toxic barrel: boom + lid clang + debris. */
  barrel_explode: {
    recipe: (s) => {
      boom(s, { size: 1.1, gain: 0.75 });
      clang(s, { freq: 380, dur: 0.6, at: 0.02, gain: 0.25 });
      return crackle(s, { count: 12, spread: 0.7, at: 0.1, gain: 0.25, freq: 1800 });
    },
    variation: 0.06,
    maxVoices: 3,
  },
  /** Splintering crate. */
  crate_break: {
    recipe: (s) => {
      thud(s, { from: 150, to: 70, dur: 0.15, gain: 0.5 });
      crunch(s, { count: 7, spread: 0.18, gain: 0.5 });
      let end = 0;
      for (let i = 0; i < 4; i++) {
        end = tone(s, {
          wave: "triangle",
          from: s.range(600, 1300),
          dur: 0.06,
          at: 0.12 + i * s.range(0.05, 0.09),
          gain: 0.18,
        });
      }
      return end;
    },
    variation: 0.07,
  },
  /** Rumbling collapse with tumbling debris. */
  wall_crumble: {
    recipe: (s) => {
      burst(s, {
        dur: 0.9,
        gain: 0.5,
        color: "brown",
        type: "lowpass",
        from: 600,
        to: 150,
        q: 0.8,
        attack: 0.03,
      });
      thud(s, { from: 90, to: 35, dur: 0.5, gain: 0.6 });
      return crunch(s, { count: 14, spread: 0.8, at: 0.05, gain: 0.35 });
    },
    variation: 0.05,
    maxVoices: 2,
  },
  /** Flush swirl + gurgles, then a big spring BOING. */
  toilet_launch: {
    recipe: (s) => {
      burst(s, {
        dur: 0.6,
        gain: 0.35,
        color: "pink",
        from: 600,
        to: 2400,
        q: 2,
        attack: 0.08,
        sustain: true,
      });
      bubbles(s, { count: 8, spread: 0.45, low: 200, high: 600, gain: 0.22 });
      return boing(s, {
        from: 160,
        to: 380,
        dur: 0.6,
        at: 0.45,
        gain: 0.5,
        wobble: 700,
        wave: "triangle",
      });
    },
    variation: 0.05,
    maxVoices: 2,
  },
  /** Heavy metal-box "CLUNK" + can rattle. */
  vending_clunk: {
    recipe: (s) => {
      thud(s, { from: 110, to: 55, dur: 0.18, gain: 0.7 });
      clang(s, { freq: 220, dur: 0.25, gain: 0.3 });
      return crackle(s, { count: 5, spread: 0.2, at: 0.08, gain: 0.25, freq: 3500 });
    },
    variation: 0.05,
  },
  /** Vending machine topples: boom, long clang, glass, bouncing cans. */
  vending_crash: {
    recipe: (s) => {
      boom(s, { size: 0.8, gain: 0.6 });
      clang(s, { freq: 160, dur: 1, gain: 0.35 });
      burst(s, { dur: 0.4, at: 0.03, gain: 0.25, type: "highpass", from: 5000, q: 0.7 });
      crackle(s, { count: 10, spread: 0.3, at: 0.03, gain: 0.25, freq: 6000 });
      let end = 0;
      let at = 0.25;
      let gap = 0.16;
      for (let i = 0; i < 6; i++) {
        end = clang(s, { freq: s.range(900, 1300), dur: 0.12, at, gain: 0.12 * (1 - i * 0.12) });
        at += gap;
        gap *= 0.75;
      }
      return Math.max(end, 1);
    },
    variation: 0.04,
    maxVoices: 2,
  },
  /** Pressurised water hiss with a gurgly start. */
  hydrant_spray: {
    recipe: (s) => {
      bubbles(s, { count: 4, spread: 0.12, low: 200, high: 500, gain: 0.2 });
      return burst(s, {
        dur: 0.9,
        gain: 0.4,
        from: 3500,
        to: 2600,
        q: 0.6,
        attack: 0.06,
        sustain: true,
      });
    },
    variation: 0.05,
    maxVoices: 2,
  },
  /** Blade whooshes over a motor hum. */
  fan_whoosh: {
    recipe: (s) => {
      tone(s, {
        wave: "sawtooth",
        from: 95,
        dur: 0.75,
        gain: 0.12,
        sustain: true,
        attack: 0.08,
        lowpass: 400,
      });
      let end = 0;
      for (let i = 0; i < 6; i++)
        end = whoosh(s, { dur: 0.13, at: i * 0.11, from: 500, to: 1400, gain: 0.3 });
      return end;
    },
    variation: 0.04,
    maxVoices: 2,
  },
  /** Thick gloopy splash. */
  sludge_splash: {
    recipe: (s) => {
      splat(s, { size: 1.6, gain: 0.55 });
      return bubbles(s, { count: 6, spread: 0.35, low: 90, high: 260, at: 0.1, gain: 0.3 });
    },
    variation: 0.1,
  },
  /** Bright two-note "ting-TING". */
  coin: {
    recipe: (s) => {
      tone(s, { wave: "pulse12", from: 1318, dur: 0.05, gain: 0.22, lowpass: 8000 });
      return tone(s, {
        wave: "pulse12",
        from: 1976,
        dur: 0.18,
        at: 0.05,
        gain: 0.24,
        lowpass: 8000,
      });
    },
    variation: 0.02,
    maxVoices: 3,
  },
  /** Rare gem: shimmering bell arpeggio. */
  gem: {
    recipe: (s) => {
      arpeggio(s, [1319, 1661, 1976, 2637], 0.055, { wave: "triangle", gain: 0.2 });
      bell(s, 2637, 0.8, 0.18, 0.22);
      return burst(s, { dur: 0.7, at: 0.1, gain: 0.07, type: "highpass", from: 7000, q: 0.7 });
    },
    variation: 0.01,
    maxVoices: 2,
  },
  /** Gulp, gulp... "aah". */
  health_pickup: {
    recipe: (s) => {
      tone(s, { from: 150, to: 330, dur: 0.09, gain: 0.45, lowpass: 900 });
      tone(s, { from: 160, to: 360, dur: 0.09, at: 0.16, gain: 0.45, lowpass: 900 });
      return syllable(s, {
        f0: 210,
        bend: 0.85,
        vowel: "a",
        dur: 0.3,
        at: 0.32,
        gain: 0.35,
        shift: 1.15,
      });
    },
    variation: 0.04,
    maxVoices: 2,
  },
  /** "Ding-ding!" over a funky E9 clav stab. */
  checkpoint: {
    recipe: (s) => {
      for (const freq of [207.65, 293.66, 369.99]) {
        tone(s, {
          wave: "pulse25",
          from: freq,
          dur: 0.18,
          gain: 0.14,
          bandpass: { freq: 1400, q: 2 },
        });
      }
      bell(s, 1319, 0.5, 0.2, 0.08);
      return bell(s, 1976, 0.6, 0.2, 0.2);
    },
    variation: 0.01,
    maxVoices: 1,
  },
} satisfies Partial<Record<SfxId, SfxDef>>;
