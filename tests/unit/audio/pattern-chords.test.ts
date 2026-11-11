import { describe, expect, it } from "vitest";
import { chordToMidis } from "../../../src/audio/music/chords";
import { parseHits, parseNotes } from "../../../src/audio/music/pattern";

describe("parseNotes", () => {
  it("parses one token per 16th step, ignoring bar separators", () => {
    const steps = parseNotes("E1! .   E2^ x   | .   E1  -   B1h");
    expect(steps.map((s) => s.kind)).toEqual([
      "note",
      "rest",
      "note",
      "dead",
      "rest",
      "note",
      "tie",
      "note",
    ]);
  });

  it("reads articulation suffixes", () => {
    const [accentPop, slide, hammerStaccato, fallWahSoft] = parseNotes("E2!^ G1~ A1h' C6vw_");
    expect(accentPop).toEqual({ kind: "note", midis: [40], art: { accent: true, pop: true } });
    expect(slide).toMatchObject({ midis: [31], art: { slide: true } });
    expect(hammerStaccato).toMatchObject({ art: { hammer: true, staccato: true } });
    expect(fallWahSoft).toMatchObject({ midis: [84], art: { fall: true, wah: true, soft: true } });
  });

  it("parses chords and accented dead notes", () => {
    const [chord, dead] = parseNotes("G3+B3+D4! X");
    expect(chord).toMatchObject({ kind: "note", midis: [55, 59, 62], art: { accent: true } });
    expect(dead).toEqual({ kind: "dead", art: { dead: true, accent: true } });
  });

  it("rejects unknown tokens with a helpful message", () => {
    expect(() => parseNotes("E1 Q3")).toThrow(/Invalid note token "Q3"/);
    expect(() => parseNotes("E1z")).toThrow(/Invalid note token/);
  });
});

describe("parseHits", () => {
  it("maps characters to hit kinds", () => {
    expect(parseHits("xXg. o-k|x")).toEqual([
      "hit",
      "accent",
      "ghost",
      "rest",
      "alt",
      "tie",
      "mute",
      "hit",
    ]);
  });

  it("rejects unknown characters", () => {
    expect(() => parseHits("x.y.")).toThrow(/Invalid hit character "y"/);
  });
});

describe("chordToMidis", () => {
  it("builds chord symbols from the root octave", () => {
    expect(chordToMidis("Em7", 3)).toEqual([52, 55, 59, 62]);
    expect(chordToMidis("A13", 2)).toEqual([45, 49, 55, 59, 66]);
    expect(chordToMidis("B7#9", 2)).toEqual([47, 51, 57, 62]);
    expect(chordToMidis("Bbmaj7", 3)).toEqual([58, 62, 65, 69]);
    expect(chordToMidis("C", 4)).toEqual([60, 64, 67]);
  });

  it("accepts explicit voicings", () => {
    expect(chordToMidis("G3+C#4+F#4")).toEqual([55, 61, 66]);
    expect(chordToMidis("E2+E3")).toEqual([40, 52]);
  });

  it("never mistakes a chord symbol for a note name", () => {
    expect(chordToMidis("A7", 3)).toEqual([57, 61, 64, 67]);
    expect(chordToMidis("E9", 2)).toEqual([40, 44, 50, 54]);
  });

  it("rejects unknown qualities", () => {
    expect(() => chordToMidis("Cblorp")).toThrow(/Unknown chord/);
  });
});
