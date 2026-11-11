/** Bulgo's movement, combat and voice. */
import { boing, bell, tone } from "../cartoon/tones";
import { burst, splat, thud, whoosh } from "../cartoon/noises";
import { syllable, type Consonant } from "../cartoon/voices";
import type { Vowel } from "../../synth/formant";
import type { SfxId } from "../../audio-types";
import type { SfxDef } from "../types";

const BLABBER_VOWELS: Vowel[] = ["a", "e", "i", "o", "u", "ae", "uh"];
const ONSETS: (Consonant | undefined)[] = ["b", "d", "g", "m", "p", undefined, "b", "g"];

export const PLAYER_SFX = {
  /** Springy "bwoip" + puff. */
  jump: {
    recipe: (s) => {
      burst(s, { dur: 0.08, gain: 0.18, color: "pink", from: 900, to: 2400, q: 1 });
      return tone(s, {
        wave: "pulse25",
        from: 170,
        to: 560,
        dur: 0.16,
        gain: 0.32,
        lowpass: 3500,
        vibrato: { rate: 30, cents: 30 },
      });
    },
  },
  /** Higher "bwee-oip" with a sparkle. */
  double_jump: {
    recipe: (s) => {
      whoosh(s, { dur: 0.18, from: 800, to: 3000, gain: 0.25 });
      tone(s, { wave: "pulse25", from: 330, to: 980, dur: 0.15, gain: 0.3, lowpass: 5000 });
      return bell(s, 1975, 0.25, 0.12, 0.1);
    },
  },
  /** Hand slaps the wall, then a spring boing. */
  wall_jump: {
    recipe: (s) => {
      burst(s, { dur: 0.04, gain: 0.5, from: 1800, q: 0.9 });
      thud(s, { from: 260, to: 110, dur: 0.06, gain: 0.4 });
      return boing(s, { from: 300, to: 620, dur: 0.32, at: 0.02, gain: 0.32, wobble: 400 });
    },
  },
  /** Squishy thud of a lumpy body. */
  land: {
    recipe: (s) => {
      thud(s, { from: 140, to: 48, dur: 0.14, gain: 0.7 });
      return burst(s, {
        dur: 0.11,
        gain: 0.3,
        color: "pink",
        type: "lowpass",
        from: 1400,
        to: 200,
        q: 2,
      });
    },
    variation: 0.1,
  },
  /** Tiny squelch. */
  footstep: {
    recipe: (s) => {
      thud(s, { from: 110, to: 70, dur: 0.06, gain: 0.35 });
      return burst(s, {
        dur: 0.05,
        gain: 0.18,
        color: "pink",
        type: "lowpass",
        from: s.range(900, 1500),
        to: 300,
        q: 3,
      });
    },
    variation: 0.15,
  },
  /** Sneaker squeak + friction hiss. */
  slide: {
    recipe: (s) => {
      tone(s, {
        wave: "pulse12",
        from: 1300,
        to: 1650,
        dur: 0.1,
        gain: 0.18,
        bandpass: { freq: 2000, q: 2 },
        vibrato: { rate: 35, cents: 60 },
      });
      return burst(s, {
        dur: 0.38,
        gain: 0.3,
        attack: 0.03,
        from: 1400,
        to: 700,
        q: 1.2,
        sustain: true,
      });
    },
    maxVoices: 2,
  },
  punch_whoosh: {
    recipe: (s) => whoosh(s, { dur: 0.17, from: 500, to: 2600, gain: 0.5 }),
    variation: 0.08,
  },
  /** Cartoon "BONK": coconut knock + slap. */
  punch_hit: {
    recipe: (s) => {
      burst(s, { dur: 0.05, gain: 0.55, from: 1600, q: 0.9 });
      tone(s, { from: 650, to: 180, dur: 0.09, gain: 0.5, attack: 0.001 });
      return thud(s, { from: 180, to: 60, dur: 0.12, gain: 0.55 });
    },
    variation: 0.08,
  },
  /** "KA-POW": heavy thump, crunchy noise and a falling zap. */
  punch_heavy: {
    recipe: (s) => {
      burst(s, { dur: 0.12, gain: 0.55, color: "pink", from: 2400, to: 500, q: 0.8 });
      tone(s, { wave: "square", from: 900, to: 120, dur: 0.16, gain: 0.22, lowpass: 3000 });
      return thud(s, { from: 160, to: 38, dur: 0.32, gain: 0.85 });
    },
    variation: 0.05,
  },
  /** Rising shimmer that lands on a "ready!" ding. */
  charge_ready: {
    recipe: (s) => {
      tone(s, {
        wave: "sawtooth",
        from: 220,
        to: 880,
        dur: 0.25,
        gain: 0.18,
        lowpass: 2500,
        sustain: true,
      });
      bell(s, 1760, 0.5, 0.22, 0.24);
      return bell(s, 2637, 0.45, 0.14, 0.3);
    },
    maxVoices: 1,
  },
  /** "Yowch!" */
  hurt: {
    recipe: (s) => {
      burst(s, { dur: 0.04, gain: 0.35, from: 1500, q: 1 });
      return syllable(s, {
        f0: 420,
        bend: 0.55,
        vowel: "a",
        toVowel: "u",
        dur: 0.26,
        gain: 0.55,
        shift: 1.25,
        consonant: "b",
      });
    },
    variation: 0.06,
    maxVoices: 2,
  },
  /** Long "waaah-wah-wa" deflating wail and a final plop. */
  player_death: {
    recipe: (s) => {
      syllable(s, {
        f0: 520,
        bend: 0.4,
        vowel: "a",
        toVowel: "o",
        dur: 0.7,
        gain: 0.5,
        shift: 1.2,
        jitter: 40,
      });
      tone(s, {
        wave: "sine",
        from: 1100,
        to: 140,
        dur: 1.0,
        at: 0.1,
        gain: 0.25,
        vibrato: { rate: 7, cents: 90 },
      });
      return splat(s, { size: 1.2, at: 1.05, gain: 0.55 });
    },
    variation: 0.02,
    maxVoices: 1,
  },
  /** Magic "ploop" + rising arpeggio of bells. */
  respawn: {
    recipe: (s) => {
      tone(s, { from: 180, to: 720, dur: 0.18, gain: 0.35 });
      let end = 0;
      [523, 659, 784, 1047].forEach((freq, i) => {
        end = bell(s, freq * 2, 0.45, 0.16, 0.12 + i * 0.07);
      });
      burst(s, { dur: 0.6, at: 0.1, gain: 0.08, from: 8000, q: 0.7 });
      return end;
    },
    maxVoices: 1,
  },
  /** One gibberish syllable; call repeatedly while text types out. Pitch picks the speaker. */
  blabber: {
    recipe: (s) =>
      syllable(s, {
        f0: s.range(210, 290),
        bend: s.range(0.8, 1.25),
        vowel: s.pick(BLABBER_VOWELS),
        toVowel: s.pick(BLABBER_VOWELS),
        dur: s.range(0.06, 0.11),
        gain: 0.5,
        shift: 1.35,
        consonant: s.pick(ONSETS),
        wave: s.pick(["sawtooth", "pulse25"] as const),
      }),
    variation: 0.12,
    maxVoices: 2,
  },
  /** "BWAAARP": low jittery buzz with vocal fry. */
  burp: {
    recipe: (s) =>
      syllable(s, {
        f0: s.range(70, 92),
        bend: 0.8,
        vowel: "o",
        toVowel: "a",
        dur: s.range(0.55, 0.8),
        gain: 0.7,
        shift: 0.9,
        jitter: 120,
        fry: 31,
        consonant: "b",
      }),
    variation: 0.08,
    maxVoices: 2,
  },
} satisfies Partial<Record<SfxId, SfxDef>>;
