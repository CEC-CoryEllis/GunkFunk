/** Weapon fire / impact sounds: sock cannon, snot blaster, rubber-chicken launcher. */
import { boom, bubbles, burst, splat, thud, whoosh } from "../cartoon/noises";
import { boing, tone } from "../cartoon/tones";
import { squeal, syllable } from "../cartoon/voices";
import type { SfxId } from "../../audio-types";
import type { SfxDef } from "../types";

export const WEAPON_SFX = {
  /** Soft cloth "fwup" + rubbery thwip. */
  sock_fire: {
    recipe: (s) => {
      whoosh(s, { dur: 0.12, from: 600, to: 1800, gain: 0.35 });
      thud(s, { from: 210, to: 80, dur: 0.09, gain: 0.45 });
      return tone(s, { wave: "pulse25", from: 420, to: 860, dur: 0.07, gain: 0.18, lowpass: 3000 });
    },
    variation: 0.08,
  },
  /** Smelly "fwump-pfff". */
  sock_hit: {
    recipe: (s) => {
      thud(s, { from: 170, to: 70, dur: 0.1, gain: 0.5 });
      return burst(s, {
        dur: 0.22,
        at: 0.03,
        gain: 0.25,
        color: "pink",
        from: 900,
        to: 2800,
        q: 1.4,
      });
    },
    variation: 0.1,
  },
  /** Wet "schlllp" with a bubbly slurp up. */
  snot_fire: {
    recipe: (s) => {
      burst(s, {
        dur: 0.16,
        gain: 0.35,
        color: "pink",
        type: "lowpass",
        from: 500,
        to: 3500,
        q: 4,
      });
      tone(s, { from: 180, to: 640, dur: 0.14, gain: 0.35 });
      return bubbles(s, { count: 4, spread: 0.12, low: 300, high: 900, gain: 0.18 });
    },
    variation: 0.08,
  },
  /** Gooey little boing. */
  snot_bounce: {
    recipe: (s) => {
      burst(s, {
        dur: 0.06,
        gain: 0.25,
        color: "pink",
        type: "lowpass",
        from: 2000,
        to: 300,
        q: 3,
      });
      return boing(s, { from: 260, to: 420, dur: 0.22, gain: 0.32, wobble: 300 });
    },
    variation: 0.1,
  },
  snot_splat: {
    recipe: (s) => splat(s, { size: 1, gain: 0.6 }),
    variation: 0.1,
  },
  /** The rubber chicken: "SQUEEEEAAK". */
  chicken_fire: {
    recipe: (s) => squeal(s, { from: 700, peak: 1250, to: 950, dur: 0.38, gain: 0.45 }),
    variation: 0.09,
    maxVoices: 3,
  },
  /** Pop + feather poof + indignant "BAWK!". */
  chicken_explode: {
    recipe: (s) => {
      boom(s, { size: 0.45, gain: 0.5 });
      burst(s, { dur: 0.5, at: 0.04, gain: 0.22, from: 3200, to: 1800, q: 0.8, attack: 0.05 });
      syllable(s, {
        f0: 620,
        bend: 1.35,
        vowel: "a",
        toVowel: "o",
        dur: 0.12,
        at: 0.06,
        gain: 0.45,
        shift: 1.8,
        consonant: "b",
      });
      return syllable(s, {
        f0: 760,
        bend: 0.7,
        vowel: "a",
        dur: 0.16,
        at: 0.2,
        gain: 0.45,
        shift: 1.8,
        consonant: "k",
      });
    },
    variation: 0.06,
  },
  /** Mechanical "chk-chk" ratchet and a rising blip. */
  weapon_switch: {
    recipe: (s) => {
      burst(s, { dur: 0.025, gain: 0.45, from: 2600, q: 3 });
      burst(s, { dur: 0.025, at: 0.06, gain: 0.45, from: 1900, q: 3 });
      return tone(s, {
        wave: "pulse25",
        from: 600,
        to: 1200,
        dur: 0.08,
        at: 0.1,
        gain: 0.2,
        lowpass: 4000,
      });
    },
    variation: 0.03,
    maxVoices: 2,
  },
  /** Dry click, then a deflating raspberry: "pthbbbt". */
  ammo_empty: {
    recipe: (s) => {
      burst(s, { dur: 0.02, gain: 0.4, from: 3500, q: 2 });
      return syllable(s, {
        f0: 95,
        bend: 0.7,
        vowel: "u",
        dur: 0.3,
        at: 0.05,
        gain: 0.45,
        fry: 38,
        jitter: 80,
        consonant: "p",
      });
    },
    variation: 0.06,
    maxVoices: 2,
  },
} satisfies Partial<Record<SfxId, SfxDef>>;
