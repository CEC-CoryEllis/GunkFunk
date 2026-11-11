/**
 * Compiles authored song data (sections of patterns + an arrangement) into a flat
 * per-step event list that the playback engine can schedule cheaply. Pure.
 */
import { chordToMidis } from "./chords";
import { type Hit, type MelodicStep, parseHits, parseNotes } from "./pattern";
import type {
  ChordsPart,
  CompiledSong,
  DrumsPart,
  NoteEvent,
  NotesPart,
  SectionDef,
  SongDef,
  SongEvent,
} from "./song-types";
import { STEPS_PER_BAR } from "./timing";

export const VELOCITY = { accent: 1, normal: 0.78, soft: 0.5, ghost: 0.3, dead: 0.55 } as const;
const DEFAULT_TAIL = 1.5;
const FALLBACK_MIDI = 40; // E2

export function compileSong(def: SongDef, name = "song"): CompiledSong {
  const layerNames = new Set(def.layers.map((layer) => layer.name));
  const events: SongEvent[][] = [];
  let loopStart = 0;
  def.arrangement.forEach((sectionName, index) => {
    const section = def.sections[sectionName];
    if (!section) throw new Error(`${name}: unknown section "${sectionName}"`);
    if (index === (def.loopTo ?? 0)) loopStart = events.length;
    const sectionEvents = compileSection(section, layerNames, `${name}/${sectionName}`);
    for (const stepEvents of sectionEvents) events.push(stepEvents);
  });
  return {
    bpm: def.bpm,
    swing: def.swing ?? 0,
    layers: def.layers,
    events,
    totalSteps: events.length,
    loopStart,
    loop: def.loop,
    tail: def.tail ?? DEFAULT_TAIL,
  };
}

/**
 * Maps an ever-increasing playback position to a step of the song, honouring the loop.
 * Returns -1 once a non-looping song has ended.
 */
export function songStepAt(song: CompiledSong, position: number): number {
  if (position < song.totalSteps) return position;
  if (!song.loop) return -1;
  const loopLength = song.totalSteps - song.loopStart;
  return song.loopStart + ((position - song.loopStart) % loopLength);
}

function compileSection(
  section: SectionDef,
  layerNames: ReadonlySet<string>,
  where: string,
): SongEvent[][] {
  const steps = section.steps ?? section.bars * STEPS_PER_BAR;
  const events: SongEvent[][] = Array.from({ length: steps }, () => []);
  section.parts.forEach((part, index) => {
    const at = `${where} part ${index} (${part.layer})`;
    if (!layerNames.has(part.layer)) throw new Error(`${at}: unknown layer "${part.layer}"`);
    if (part.type === "notes") addNotes(events, part, at);
    else if (part.type === "chords") addChords(events, part, at);
    else addDrums(events, part, at);
  });
  return events;
}

function expand<T>(pattern: readonly T[], steps: number, where: string): T[] {
  if (pattern.length === 0 || steps % pattern.length !== 0) {
    throw new Error(
      `${where}: pattern length ${pattern.length} does not divide section length ${steps}`,
    );
  }
  return Array.from({ length: steps }, (_, i) => pattern[i % pattern.length]);
}

function tieLength(cells: readonly (MelodicStep | Hit)[], from: number): number {
  let length = 1;
  while (from + length < cells.length) {
    const next = cells[from + length];
    if (next !== "tie" && !(typeof next === "object" && next.kind === "tie")) break;
    length++;
  }
  return length;
}

function addNotes(events: SongEvent[][], part: NotesPart, where: string): void {
  const cells = expand(parseNotes(part.pattern), events.length, where);
  const transpose = part.transpose ?? 0;
  const gain = part.gain ?? 1;
  let previous: NoteEvent | null = null;
  // A slide on the first note glides from the pattern's last note (it loops).
  let lastMidi = lastPitch(cells) ?? FALLBACK_MIDI;
  cells.forEach((cell, step) => {
    if (cell.kind === "rest" || cell.kind === "tie") {
      if (cell.kind === "rest") previous = null;
      return;
    }
    const event: NoteEvent = {
      kind: "note",
      layer: part.layer,
      instrument: part.instrument,
      midis: cell.kind === "dead" ? [lastMidi + transpose] : cell.midis.map((m) => m + transpose),
      steps: tieLength(cells, step),
      velocity: velocityOf(cell) * gain,
      art: cell.art,
      legato: false,
    };
    if (cell.kind === "note") {
      if (cell.art.slide || cell.art.hammer) {
        event.glideFrom = lastMidi + transpose;
        if (previous) previous.legato = true;
      }
      lastMidi = cell.midis[0];
    }
    events[step].push(event);
    previous = event;
  });
}

function lastPitch(cells: readonly MelodicStep[]): number | undefined {
  for (let i = cells.length - 1; i >= 0; i--) {
    const cell = cells[i];
    if (cell.kind === "note") return cell.midis[0];
  }
  return undefined;
}

function velocityOf(cell: MelodicStep): number {
  if (cell.kind !== "note" && cell.kind !== "dead") return 0;
  if (cell.kind === "dead") return cell.art.accent ? 0.85 : VELOCITY.dead;
  if (cell.art.accent) return VELOCITY.accent;
  if (cell.art.soft) return VELOCITY.soft;
  return VELOCITY.normal;
}

function hitVelocity(hit: Hit): number {
  if (hit === "accent") return VELOCITY.accent;
  if (hit === "ghost") return VELOCITY.ghost;
  return VELOCITY.normal;
}

function addChords(events: SongEvent[][], part: ChordsPart, where: string): void {
  const hits = expand(parseHits(part.rhythm), events.length, where);
  const bars = Math.ceil(events.length / STEPS_PER_BAR);
  const perBar = expand(part.chords, bars, `${where} chords`).map((entry) =>
    entry.split(/\s+/).map((chord) => chordToMidis(chord, part.octave ?? 3)),
  );
  const gain = part.gain ?? 1;
  hits.forEach((hit, step) => {
    if (hit === "rest" || hit === "tie") return;
    const barChords = perBar[Math.floor(step / STEPS_PER_BAR)];
    const slot = Math.floor(((step % STEPS_PER_BAR) / STEPS_PER_BAR) * barChords.length);
    events[step].push({
      kind: "note",
      layer: part.layer,
      instrument: part.instrument,
      midis: barChords[slot],
      steps: tieLength(hits, step),
      velocity: hitVelocity(hit) * gain,
      art: { mute: hit === "mute", accent: hit === "accent" },
      legato: false,
    });
  });
}

function addDrums(events: SongEvent[][], part: DrumsPart, where: string): void {
  const gain = part.gain ?? 1;
  for (const [voice, line] of Object.entries(part.lines) as [keyof DrumsPart["lines"], string][]) {
    const hits = expand(parseHits(line), events.length, `${where} ${voice}`);
    hits.forEach((hit, step) => {
      if (hit === "rest" || hit === "tie") return;
      events[step].push({
        kind: "drum",
        layer: part.layer,
        voice,
        velocity: hitVelocity(hit) * gain,
        alt: hit === "alt",
      });
    });
  }
}
