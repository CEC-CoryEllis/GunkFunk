/** Enemy reactions and voices. */
import { bubbles, burst, splat, thud, whoosh } from "../cartoon/noises";
import { bell, boing, tone } from "../cartoon/tones";
import { syllable } from "../cartoon/voices";
import type { SfxId } from "../../audio-types";
import type { SfxDef } from "../types";

export const ENEMY_SFX = {
  /** Bonk + grunt. */
  enemy_hit: {
    recipe: (s) => {
      burst(s, { dur: 0.04, gain: 0.45, from: 1300, q: 1 });
      tone(s, { from: 480, to: 200, dur: 0.08, gain: 0.4 });
      return syllable(s, {
        f0: 180,
        bend: 0.8,
        vowel: "uh",
        dur: 0.1,
        at: 0.02,
        gain: 0.35,
        shift: 1.1,
      });
    },
    variation: 0.1,
  },
  /** "SPLORCH". */
  enemy_squish: {
    recipe: (s) => {
      splat(s, { size: 1.4, gain: 0.6 });
      return syllable(s, {
        f0: 120,
        bend: 0.6,
        vowel: "o",
        toVowel: "u",
        dur: 0.2,
        gain: 0.3,
        shift: 0.9,
        fry: 25,
      });
    },
    variation: 0.08,
  },
  /** Defeated: "POP!" + poof + sparkle. */
  enemy_pop: {
    recipe: (s) => {
      tone(s, { from: 500, to: 1600, dur: 0.06, gain: 0.45 });
      burst(s, { dur: 0.02, gain: 0.5, from: 2500, q: 0.8 });
      burst(s, { dur: 0.3, at: 0.03, gain: 0.25, color: "pink", from: 1800, to: 600, q: 0.8 });
      return bell(s, 1568, 0.35, 0.15, 0.08);
    },
    variation: 0.07,
  },
  /** "Eek-eek!" */
  rat_squeak: {
    recipe: (s) => {
      syllable(s, {
        f0: 1700,
        bend: 1.3,
        vowel: "i",
        dur: 0.07,
        gain: 0.32,
        shift: 2,
        wave: "pulse25",
      });
      return syllable(s, {
        f0: 1900,
        bend: 1.15,
        vowel: "i",
        dur: 0.09,
        at: 0.11,
        gain: 0.32,
        shift: 2,
        wave: "pulse25",
      });
    },
    variation: 0.1,
    maxVoices: 3,
  },
  /** Porcelain "CHOMP-clack" and a slosh. */
  toilet_chomp: {
    recipe: (s) => {
      tone(s, { from: 2100, dur: 0.05, gain: 0.3, attack: 0.001 });
      burst(s, { dur: 0.04, gain: 0.45, from: 3000, q: 2 });
      thud(s, { from: 200, to: 90, dur: 0.1, gain: 0.45 });
      return burst(s, {
        dur: 0.3,
        at: 0.05,
        gain: 0.25,
        color: "pink",
        type: "lowpass",
        from: 1200,
        to: 400,
        q: 3,
      });
    },
    variation: 0.08,
  },
  /** Gloopy stretch then two divergent "plips". */
  blob_split: {
    recipe: (s) => {
      burst(s, { dur: 0.22, gain: 0.3, color: "pink", type: "lowpass", from: 300, to: 2400, q: 6 });
      tone(s, { from: 300, to: 900, dur: 0.07, at: 0.2, gain: 0.35 });
      tone(s, { from: 420, to: 1300, dur: 0.07, at: 0.26, gain: 0.35 });
      return bubbles(s, { count: 3, spread: 0.1, low: 400, high: 900, at: 0.2, gain: 0.15 });
    },
    variation: 0.08,
  },
  /** "Hup!" and a whistling throw. */
  turnip_throw: {
    recipe: (s) => {
      syllable(s, {
        f0: 260,
        bend: 1.2,
        vowel: "uh",
        dur: 0.08,
        gain: 0.35,
        shift: 1.2,
        consonant: "m",
      });
      whoosh(s, { dur: 0.25, from: 1200, to: 3000, at: 0.06, gain: 0.25 });
      return tone(s, {
        from: 1600,
        to: 1100,
        dur: 0.25,
        at: 0.06,
        gain: 0.12,
        vibrato: { rate: 12, cents: 20 },
      });
    },
    variation: 0.08,
  },
  /** Disco roach flyby: buzzy wings with a doppler swoop. */
  roach_buzz: {
    recipe: (s) =>
      tone(s, {
        wave: "sawtooth",
        from: 150,
        to: 200,
        dur: 0.45,
        gain: 0.28,
        sustain: true,
        attack: 0.05,
        bandpass: { freq: 900, q: 1.5 },
        vibrato: { rate: 34, cents: 120 },
      }),
    variation: 0.1,
    maxVoices: 2,
  },
  /** Surprised "Huh?!" + a little boing. */
  enemy_alert: {
    recipe: (s) => {
      syllable(s, {
        f0: 240,
        bend: 1.7,
        vowel: "uh",
        toVowel: "a",
        dur: 0.16,
        gain: 0.45,
        shift: 1.2,
        consonant: "m",
      });
      return boing(s, { from: 700, to: 1100, dur: 0.22, at: 0.1, gain: 0.2, wobble: 250 });
    },
    variation: 0.05,
    maxVoices: 2,
  },
} satisfies Partial<Record<SfxId, SfxDef>>;
