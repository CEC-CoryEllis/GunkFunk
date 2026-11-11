/** Song data model: what track modules author, and what the compiler produces. */
import type { MusicIntensity } from "../audio-types";
import type { Articulation, DrumVoice, InstrumentId } from "../instruments/types";

/** A mixer channel whose level can follow the music intensity. */
export interface LayerDef {
  name: string;
  /** Lowest intensity at which the layer is audible (default 0). */
  from?: MusicIntensity;
  /** Explicit level per intensity [0, 1, 2]; overrides `from`. */
  levels?: readonly [number, number, number];
  /** Channel fader (default 1). */
  gain?: number;
  /** Reverb send amount 0..1 (default 0). */
  reverb?: number;
  /** Stereo position -1..1. */
  pan?: number;
}

export interface NotesPart {
  type: "notes";
  layer: string;
  instrument: InstrumentId;
  pattern: string;
  transpose?: number;
  gain?: number;
}

/** Rhythm comping: hits from `rhythm` play the chord of the current bar. */
export interface ChordsPart {
  type: "chords";
  layer: string;
  instrument: InstrumentId;
  rhythm: string;
  /** One entry per bar (cycled). An entry may hold several space-separated chords
   * that split the bar evenly. */
  chords: readonly string[];
  octave?: number;
  gain?: number;
}

export interface DrumsPart {
  type: "drums";
  layer: string;
  lines: Partial<Record<DrumVoice, string>>;
  gain?: number;
}

export type PartDef = NotesPart | ChordsPart | DrumsPart;

export interface SectionDef {
  bars: number;
  /** Exact length in 16th steps when it isn't whole bars (stingers). */
  steps?: number;
  parts: readonly PartDef[];
}

export interface SongDef {
  bpm: number;
  /** 0 = straight 16ths. */
  swing?: number;
  layers: readonly LayerDef[];
  sections: Record<string, SectionDef>;
  /** Section names in play order. */
  arrangement: readonly string[];
  /** Arrangement index the loop jumps back to (default 0). */
  loopTo?: number;
  /** Songs loop; stingers don't. */
  loop: boolean;
  /** Seconds of release / reverb tail after the last step (default 1.5). */
  tail?: number;
}

export interface NoteEvent {
  kind: "note";
  layer: string;
  instrument: InstrumentId;
  midis: number[];
  /** Length in steps (1 + ties). */
  steps: number;
  velocity: number;
  art: Articulation;
  glideFrom?: number;
  /** The next note slides / hammers out of this one, so hold it to the full length. */
  legato: boolean;
}

export interface DrumEvent {
  kind: "drum";
  layer: string;
  voice: DrumVoice;
  velocity: number;
  alt: boolean;
}

export type SongEvent = NoteEvent | DrumEvent;

export interface CompiledSong {
  bpm: number;
  swing: number;
  layers: readonly LayerDef[];
  /** `events[step]` = everything that starts on that 16th step. */
  events: SongEvent[][];
  totalSteps: number;
  loopStart: number;
  loop: boolean;
  tail: number;
}
