/**
 * Chord symbols ("Em9", "A13", "B7#9") or explicit voicings ("G3+B3+D4") → MIDI notes.
 * Anything containing "+" is a voicing; everything else is a symbol (so "A7" is the
 * dominant seventh chord, never the note A7).
 */
import { noteToMidi } from "./notes";

const QUALITIES: Record<string, readonly number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "5": [0, 7, 12],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  "9": [0, 4, 10, 14],
  m9: [0, 3, 10, 14],
  maj9: [0, 4, 11, 14],
  "13": [0, 4, 10, 14, 21],
  "7#9": [0, 4, 10, 15],
  "7b9": [0, 4, 10, 13],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
  add9: [0, 4, 7, 14],
};

const SYMBOL = /^([A-G][#b]?)(.*)$/;

/** Resolve a chord symbol with its root in `octave`, or an explicit `+`-joined voicing. */
export function chordToMidis(chord: string, octave = 3): number[] {
  if (chord.includes("+")) return chord.split("+").map(noteToMidi);
  const match = SYMBOL.exec(chord);
  const intervals = match ? QUALITIES[match[2]] : undefined;
  if (!match || !intervals) throw new Error(`Unknown chord "${chord}"`);
  const root = noteToMidi(`${match[1]}${octave}`);
  return intervals.map((interval) => root + interval);
}
