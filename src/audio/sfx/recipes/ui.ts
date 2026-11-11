/** Menu sounds — funky rather than beepy: slap plucks, a horn-ish chirp, a record scratch. */
import { burst } from "../cartoon/noises";
import { tone } from "../cartoon/tones";
import type { SfxId } from "../../audio-types";
import type { SfxDef } from "../types";

export const UI_SFX = {
  /** Short muted slap-bass pluck. */
  menu_move: {
    recipe: (s) => {
      const a = tone(s, { wave: "sawtooth", from: 196, dur: 0.07, gain: 0.45, lowpass: 1800 });
      const b = burst(s, { dur: 0.015, gain: 0.25, from: 3000, q: 1.2 });
      return Math.max(a, b);
    },
    variation: 0.03,
  },
  /** "Ba-DING!": popped octave then a bright square chirp. */
  menu_select: {
    recipe: (s) => {
      tone(s, { wave: "sawtooth", from: 220, dur: 0.08, gain: 0.45, lowpass: 2600 });
      burst(s, { dur: 0.02, gain: 0.3, from: 3800, q: 1.4 });
      tone(s, {
        wave: "pulse25",
        from: 880,
        to: 990,
        dur: 0.06,
        at: 0.06,
        gain: 0.25,
        lowpass: 5000,
      });
      return tone(s, {
        wave: "pulse25",
        from: 1320,
        dur: 0.22,
        at: 0.11,
        gain: 0.28,
        lowpass: 6000,
        vibrato: { rate: 9, cents: 25 },
      });
    },
    variation: 0.02,
  },
  /** Descending "bwop". */
  menu_back: {
    recipe: (s) => {
      tone(s, { wave: "triangle", from: 520, to: 240, dur: 0.14, gain: 0.5 });
      return tone(s, { wave: "sawtooth", from: 130, to: 90, dur: 0.12, gain: 0.25, lowpass: 900 });
    },
    variation: 0.03,
  },
  /** Vinyl record scratch: "wikka-wikka". */
  pause: {
    recipe: (s) => {
      const segments: [number, number, number][] = [
        [0, 400, 1500],
        [0.07, 1500, 350],
        [0.14, 500, 1800],
        [0.22, 1800, 260],
      ];
      let end = 0;
      for (const [at, from, to] of segments) {
        burst(s, { dur: 0.08, at, gain: 0.4, color: "pink", from: from * 1.6, to: to * 1.6, q: 3 });
        end = tone(s, { wave: "sawtooth", from, to, dur: 0.08, at, gain: 0.22, lowpass: 2500 });
      }
      return end;
    },
    variation: 0.04,
    maxVoices: 1,
  },
} satisfies Partial<Record<SfxId, SfxDef>>;
