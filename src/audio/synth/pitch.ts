/** Pitch maths shared by instruments, the sequencer and the note-name parser. */

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
