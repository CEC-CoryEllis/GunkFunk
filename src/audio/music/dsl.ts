/** Tiny constructors that keep the track modules readable. */
import type { DrumVoice, InstrumentId } from "../instruments/types";
import type { ChordsPart, DrumsPart, NotesPart } from "./song-types";

export function notes(
  layer: string,
  instrument: InstrumentId,
  pattern: string,
  options: { transpose?: number; gain?: number } = {},
): NotesPart {
  return { type: "notes", layer, instrument, pattern, ...options };
}

export function comp(
  layer: string,
  instrument: InstrumentId,
  rhythm: string,
  chords: readonly string[],
  options: { octave?: number; gain?: number } = {},
): ChordsPart {
  return { type: "chords", layer, instrument, rhythm, chords, ...options };
}

export function drums(
  layer: string,
  lines: Partial<Record<DrumVoice, string>>,
  options: { gain?: number } = {},
): DrumsPart {
  return { type: "drums", layer, lines, ...options };
}

/** Joins bars of notation (each a string) into one pattern. */
export function bars(...patterns: string[]): string {
  return patterns.join(" | ");
}

/** Hit lines: a silent bar. */
export const REST_BAR = "................";

/** Melodic lines: a silent bar. */
export const REST_NOTES = ". . . . . . . . . . . . . . . .";
