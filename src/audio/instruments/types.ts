/** Shared instrument interfaces. Instruments are context-agnostic: they work in an
 * `AudioContext` and in an `OfflineAudioContext` alike. */

export type InstrumentId =
  | "slapBass"
  | "softBass"
  | "clav"
  | "distGuitar"
  | "lead"
  | "brass"
  | "trombone"
  | "organ"
  | "vibes"
  | "epiano";

export type DrumVoice =
  | "kick"
  | "snare"
  | "hat"
  | "clap"
  | "tom"
  | "tomLo"
  | "crash"
  | "cowbell"
  | "conga"
  | "congaLo"
  | "shaker"
  | "rim"
  | "brush";

/** Playing-technique flags parsed from the pattern notation. */
export interface Articulation {
  accent?: boolean;
  /** Bass: popped (plucked up) string – higher, brighter, snappier. */
  pop?: boolean;
  /** Dead / ghost note: muted percussive thud. */
  dead?: boolean;
  /** Slide (portamento) from the previous note. */
  slide?: boolean;
  /** Hammer-on: fast legato pitch change without a new pluck. */
  hammer?: boolean;
  staccato?: boolean;
  /** Pitch falls off at the end of the note. */
  fall?: boolean;
  /** Plunger / envelope "wah". */
  wah?: boolean;
  soft?: boolean;
  /** Muted scratch (clav / guitar "chk"). */
  mute?: boolean;
}

export interface NoteSpec {
  /** One or more MIDI notes (several = chord). */
  midis: readonly number[];
  /** Seconds the note is held. */
  duration: number;
  /** 0..1 */
  velocity: number;
  art: Articulation;
  /** Previous MIDI note, for slides / hammer-ons / portamento. */
  glideFrom?: number;
}

export interface PitchedInstrument {
  play(time: number, note: NoteSpec): void;
  /** Stops any free-running modulators (LFOs). */
  dispose?(): void;
}

export interface DrumKit {
  hit(time: number, voice: DrumVoice, velocity: number, alt: boolean): void;
}

export type InstrumentFactory = (ctx: BaseAudioContext, out: AudioNode) => PitchedInstrument;
