/** Transformation (Wrecking Ball) and boss sounds. */
import { boom, burst, clang, crackle, crunch, thud, whoosh } from "../cartoon/noises";
import { boing, tone } from "../cartoon/tones";
import { roar, syllable } from "../cartoon/voices";
import type { SfxId } from "../../audio-types";
import type { SfxDef } from "../types";

export const BOSS_SFX = {
  /** Balloon inflation: rubbery stretch rising in pitch, air hiss, then "pop-boing". */
  transform_inflate: {
    recipe: (s) => {
      syllable(s, {
        f0: 140,
        bend: 4,
        vowel: "u",
        toVowel: "i",
        dur: 0.8,
        gain: 0.4,
        shift: 1.3,
        jitter: 30,
      });
      burst(s, { dur: 0.8, gain: 0.18, from: 2000, to: 5000, q: 1, attack: 0.3, sustain: true });
      return boing(s, { from: 300, to: 520, dur: 0.4, at: 0.8, gain: 0.45, wobble: 500 });
    },
    variation: 0.02,
    maxVoices: 1,
  },
  /** Heavy rubber ball "BOING". */
  ball_bounce: {
    recipe: (s) => {
      thud(s, { from: 120, to: 55, dur: 0.12, gain: 0.6 });
      return boing(s, { from: 110, to: 230, dur: 0.35, gain: 0.5, wobble: 450, wave: "triangle" });
    },
    variation: 0.08,
    maxVoices: 3,
  },
  /** "KA-RUNCH": the ball smashes through something. */
  ball_smash: {
    recipe: (s) => {
      boom(s, { size: 0.6, gain: 0.6 });
      crunch(s, { count: 9, spread: 0.25, gain: 0.45 });
      return boing(s, { from: 90, to: 180, dur: 0.4, at: 0.05, gain: 0.35, wobble: 500 });
    },
    variation: 0.05,
  },
  boss_roar: {
    recipe: (s) => roar(s, { f0: 72, dur: 1.4, gain: 0.55 }),
    variation: 0.04,
    maxVoices: 1,
  },
  /** Metal clank + pained grunt. */
  boss_hit: {
    recipe: (s) => {
      clang(s, { freq: 260, dur: 0.45, gain: 0.35 });
      thud(s, { from: 140, to: 50, dur: 0.2, gain: 0.6 });
      return syllable(s, {
        f0: 110,
        bend: 0.7,
        vowel: "o",
        dur: 0.22,
        at: 0.04,
        gain: 0.35,
        shift: 0.8,
        fry: 28,
      });
    },
    variation: 0.05,
    maxVoices: 2,
  },
  /** Chain of booms, debris and a long rumble. */
  boss_explode: {
    recipe: (s) => {
      let end = boom(s, { size: 1.6, gain: 0.7 });
      for (const at of [0.35, 0.7, 1.1])
        end = Math.max(end, boom(s, { size: 0.8, at: at + s.range(0, 0.1), gain: 0.5 }));
      crackle(s, { count: 25, spread: 1.8, at: 0.1, gain: 0.25, freq: 2000 });
      burst(s, {
        dur: 2.2,
        gain: 0.35,
        color: "brown",
        type: "lowpass",
        from: 300,
        to: 80,
        q: 0.7,
        attack: 0.1,
      });
      return Math.max(end, 2.2);
    },
    variation: 0.03,
    maxVoices: 1,
  },
  /** Hydraulic hiss + "KA-THOOM" + metal clank. */
  mech_stomp: {
    recipe: (s) => {
      burst(s, { dur: 0.12, gain: 0.25, type: "highpass", from: 4000, q: 0.7 });
      thud(s, { from: 70, to: 30, dur: 0.45, at: 0.08, gain: 0.9 });
      return clang(s, { freq: 140, dur: 0.35, at: 0.08, gain: 0.25 });
    },
    variation: 0.05,
    maxVoices: 2,
  },
  /** Suction "THWOOMP" + rubbery squelch + whoosh. */
  plunger_fire: {
    recipe: (s) => {
      tone(s, { from: 320, to: 70, dur: 0.14, gain: 0.6 });
      burst(s, { dur: 0.1, gain: 0.3, color: "pink", type: "lowpass", from: 2500, to: 300, q: 5 });
      return whoosh(s, { dur: 0.3, at: 0.06, from: 700, to: 2000, gain: 0.3 });
    },
    variation: 0.06,
    maxVoices: 2,
  },
} satisfies Partial<Record<SfxId, SfxDef>>;
