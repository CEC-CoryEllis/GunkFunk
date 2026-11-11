import { describe, expect, it } from "vitest";
import { midiToFreq, noteToMidi } from "../../../src/audio/music/notes";
import {
  barDuration,
  STEPS_PER_BAR,
  stepDuration,
  stepTime,
  swingOffset,
} from "../../../src/audio/music/timing";

describe("note names", () => {
  it.each([
    ["C4", 60],
    ["A4", 69],
    ["E1", 28],
    ["C#5", 73],
    ["Bb2", 46],
    ["B-1", 11],
  ])("%s → MIDI %i", (name, midi) => {
    expect(noteToMidi(name)).toBe(midi);
  });

  it("rejects malformed names", () => {
    for (const bad of ["H2", "C", "c4", "E#", "Cb#4", ""]) {
      expect(() => noteToMidi(bad)).toThrow(/Invalid note/);
    }
  });
});

describe("pitch maths", () => {
  it("converts MIDI → Hz", () => {
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(81)).toBeCloseTo(880, 9);
    expect(midiToFreq(28)).toBeCloseTo(41.2034, 3); // E1, the slap bass's open string
    expect(midiToFreq(60)).toBeCloseTo(261.6256, 3);
  });
});

describe("tempo grid", () => {
  it("has 16th-note steps", () => {
    expect(STEPS_PER_BAR).toBe(16);
    expect(stepDuration(120)).toBeCloseTo(0.125, 12);
    expect(barDuration(120)).toBeCloseTo(2, 12);
    expect(barDuration(110)).toBeCloseTo((60 / 110) * 4, 12);
  });

  it("swing only delays off-beat 16ths", () => {
    const bpm = 100;
    expect(swingOffset(0, bpm, 0.2)).toBe(0);
    expect(swingOffset(2, bpm, 0.2)).toBe(0);
    expect(swingOffset(1, bpm, 0.2)).toBeCloseTo(0.2 * stepDuration(bpm), 12);
    expect(swingOffset(3, bpm, 0)).toBe(0);
  });

  it("swung step pairs keep the beat grid intact", () => {
    const bpm = 110;
    const swing = 1 / 3; // triplet shuffle: 2:1 long-short
    const t0 = stepTime(1, 0, bpm, swing);
    const t1 = stepTime(1, 1, bpm, swing);
    const t2 = stepTime(1, 2, bpm, swing);
    expect(t0).toBe(1);
    expect((t1 - t0) / (t2 - t1)).toBeCloseTo(2, 9);
    expect(t2 - t0).toBeCloseTo(2 * stepDuration(bpm), 12);
    expect(stepTime(0, 16, bpm, swing)).toBeCloseTo(barDuration(bpm), 12);
  });

  it("is strictly increasing for any sane swing", () => {
    for (const swing of [0, 0.14, 0.3, 0.6]) {
      let previous = -Infinity;
      for (let step = 0; step < 64; step++) {
        const t = stepTime(0, step, 128, swing);
        expect(t).toBeGreaterThan(previous);
        previous = t;
      }
    }
  });
});
