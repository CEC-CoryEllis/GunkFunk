/** Vowel formant filter banks for cartoon voices (blabber, burps, squeaks, roars). */
import { filter, gain } from "./nodes";

export type Vowel = "a" | "e" | "i" | "o" | "u" | "ae" | "uh";

interface Formant {
  freq: number;
  q: number;
  level: number;
}

/** Rough adult formants (F1–F3). Cartoon voices scale these with `shift`. */
const VOWELS: Record<Vowel, readonly [Formant, Formant, Formant]> = {
  a: [
    { freq: 800, q: 8, level: 1 },
    { freq: 1150, q: 9, level: 0.6 },
    { freq: 2900, q: 12, level: 0.25 },
  ],
  e: [
    { freq: 400, q: 7, level: 1 },
    { freq: 1700, q: 10, level: 0.5 },
    { freq: 2600, q: 12, level: 0.3 },
  ],
  i: [
    { freq: 280, q: 6, level: 1 },
    { freq: 2250, q: 12, level: 0.45 },
    { freq: 3000, q: 14, level: 0.35 },
  ],
  o: [
    { freq: 450, q: 8, level: 1 },
    { freq: 800, q: 9, level: 0.6 },
    { freq: 2830, q: 14, level: 0.15 },
  ],
  u: [
    { freq: 325, q: 8, level: 1 },
    { freq: 700, q: 9, level: 0.45 },
    { freq: 2530, q: 14, level: 0.12 },
  ],
  ae: [
    { freq: 660, q: 8, level: 1 },
    { freq: 1700, q: 10, level: 0.55 },
    { freq: 2400, q: 12, level: 0.3 },
  ],
  uh: [
    { freq: 640, q: 8, level: 1 },
    { freq: 1190, q: 9, level: 0.5 },
    { freq: 2390, q: 12, level: 0.2 },
  ],
};

export interface FormantBank {
  input: GainNode;
  output: GainNode;
  filters: BiquadFilterNode[];
}

/** Three parallel band-pass filters tuned to a vowel; `shift` scales all formants. */
export function formantBank(ctx: BaseAudioContext, vowel: Vowel, shift = 1): FormantBank {
  const input = gain(ctx, 1);
  const output = gain(ctx, 1);
  const filters = VOWELS[vowel].map((f) => {
    const bp = filter(ctx, "bandpass", f.freq * shift, f.q);
    const level = gain(ctx, f.level * 3.2);
    input.connect(bp);
    bp.connect(level);
    level.connect(output);
    return bp;
  });
  return { input, output, filters };
}

/** Glide the bank's formants towards another vowel. */
export function morphVowel(
  bank: FormantBank,
  vowel: Vowel,
  t: number,
  dur: number,
  shift = 1,
): void {
  VOWELS[vowel].forEach((f, i) => {
    const param = bank.filters[i].frequency;
    param.setTargetAtTime(f.freq * shift, t, Math.max(dur, 0.005) / 3);
  });
}
