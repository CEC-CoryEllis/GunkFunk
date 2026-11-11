/**
 * Pattern notation — one token / character per 16th-note step.
 *
 * Melodic lines (`parseNotes`), whitespace-separated tokens, `|` is a visual bar/beat
 * separator and is ignored:
 *   `.`  rest            `-`  tie (hold previous note one more step)
 *   `x`  dead note       `X`  accented dead note
 *   `E2` note            `G3+B3+D4` chord (notes joined with `+`)
 * Note modifiers (suffix, combinable): `!` accent, `^` pop (bass), `~` slide from previous
 * note, `h` hammer-on, `'` staccato, `v` fall-off, `w` wah, `_` soft.
 *   e.g. "E1! . E2^ x | . E1 x E1 | G1 . A1 . | Bb1 B1h D2^ ."
 *
 * Hit lines (`parseHits`), one character per step, whitespace and `|` ignored:
 *   `.` rest  `x` hit  `X` accent  `g` ghost  `o` alt (open hat…)  `k` muted scratch  `-` tie
 *   e.g. "X..x ..x. ..X. .x.."
 */
import type { Articulation } from "../instruments/types";
import { noteToMidi } from "./notes";

export type MelodicStep =
  | { kind: "rest" }
  | { kind: "tie" }
  | { kind: "dead"; art: Articulation }
  | { kind: "note"; midis: number[]; art: Articulation };

export type Hit = "rest" | "hit" | "accent" | "ghost" | "alt" | "mute" | "tie";

const MODIFIERS: Record<string, keyof Articulation> = {
  "!": "accent",
  "^": "pop",
  "~": "slide",
  h: "hammer",
  "'": "staccato",
  v: "fall",
  w: "wah",
  _: "soft",
};

const NOTE_TOKEN = /^((?:[A-G][#b]?\d\+)*[A-G][#b]?\d)([!^~h'vw_]*)$/;

export function parseNotes(src: string): MelodicStep[] {
  const tokens = src.split(/[\s|]+/).filter((token) => token.length > 0);
  return tokens.map((token) => parseNoteToken(token));
}

function parseNoteToken(token: string): MelodicStep {
  if (token === ".") return { kind: "rest" };
  if (token === "-") return { kind: "tie" };
  if (token === "x") return { kind: "dead", art: { dead: true } };
  if (token === "X") return { kind: "dead", art: { dead: true, accent: true } };
  const match = NOTE_TOKEN.exec(token);
  if (!match) throw new Error(`Invalid note token "${token}"`);
  const midis = match[1].split("+").map(noteToMidi);
  const art: Articulation = {};
  for (const char of match[2]) art[MODIFIERS[char]] = true;
  return { kind: "note", midis, art };
}

const HIT_CHARS: Record<string, Hit> = {
  ".": "rest",
  x: "hit",
  X: "accent",
  g: "ghost",
  o: "alt",
  k: "mute",
  "-": "tie",
};

export function parseHits(src: string): Hit[] {
  const hits: Hit[] = [];
  for (const char of src) {
    if (char === "|" || /\s/.test(char)) continue;
    const hit = HIT_CHARS[char];
    if (!hit) throw new Error(`Invalid hit character "${char}" in "${src}"`);
    hits.push(hit);
  }
  return hits;
}
