/** Note names ↔ MIDI numbers ("C4" = 60, "A4" = 69, "E1" = 28). */

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_NAME = /^([A-G])([#b]?)(-?\d)$/;

export function noteToMidi(name: string): number {
  const match = NOTE_NAME.exec(name);
  if (!match) throw new Error(`Invalid note name "${name}"`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return (Number(octave) + 1) * 12 + PITCH_CLASS[letter] + shift;
}

export { midiToFreq } from "../synth/pitch";
