import { describe, expect, it } from "vitest";
import { compileSong, songStepAt, VELOCITY } from "../../../src/audio/music/compile";
import { comp, drums, notes } from "../../../src/audio/music/dsl";
import type { NoteEvent, SongDef } from "../../../src/audio/music/song-types";

function song(overrides: Partial<SongDef> = {}): SongDef {
  return {
    bpm: 120,
    loop: true,
    layers: [{ name: "bass" }, { name: "drums" }, { name: "keys" }],
    sections: {
      intro: { bars: 1, parts: [drums("drums", { kick: "x..." })] },
      verse: {
        bars: 2,
        parts: [
          notes("bass", "slapBass", "E1! - x . G1 A1~ . E2^ | . . . . . . . ."),
          comp("keys", "clav", "x-.k", ["Em7 A7", "G"], { octave: 3 }),
        ],
      },
    },
    arrangement: ["intro", "verse"],
    loopTo: 1,
    ...overrides,
  };
}

const notesAt = (events: ReturnType<typeof compileSong>["events"], step: number) =>
  events[step].filter((e): e is NoteEvent => e.kind === "note");

describe("compileSong", () => {
  const compiled = compileSong(song());
  const keysAt = (step: number) => notesAt(compiled.events, step).filter((e) => e.layer === "keys");

  it("lays sections out in arrangement order and finds the loop start", () => {
    expect(compiled.totalSteps).toBe(16 + 32);
    expect(compiled.loopStart).toBe(16);
    expect(compiled.tail).toBe(1.5);
  });

  it("cycles short drum patterns to fill the section", () => {
    const kicks = compiled.events.slice(0, 16).map((e) => e.some((x) => x.kind === "drum"));
    expect(kicks.filter(Boolean)).toHaveLength(4);
    expect(kicks[0] && kicks[4] && kicks[8] && kicks[12]).toBe(true);
  });

  it("turns ties into note lengths and keeps articulations", () => {
    const [first] = notesAt(compiled.events, 16);
    expect(first).toMatchObject({
      midis: [28],
      steps: 2,
      velocity: VELOCITY.accent,
      art: { accent: true },
    });
  });

  it("gives dead notes the previous pitch", () => {
    const [dead] = notesAt(compiled.events, 18).filter((e) => e.instrument === "slapBass");
    expect(dead).toMatchObject({ midis: [28], art: { dead: true }, velocity: VELOCITY.dead });
  });

  it("links slides to the previous note and holds that note legato", () => {
    const [g1] = notesAt(compiled.events, 20).filter((e) => e.instrument === "slapBass");
    const [a1] = notesAt(compiled.events, 21).filter((e) => e.instrument === "slapBass");
    expect(a1.glideFrom).toBe(31);
    expect(g1.legato).toBe(true);
  });

  it("comps chords per bar, splitting a bar between several chords", () => {
    expect(keysAt(16)[0]).toMatchObject({ midis: [52, 55, 59, 62], steps: 2 });
    expect(keysAt(19)[0]).toMatchObject({ midis: [52, 55, 59, 62], art: { mute: true } });
    expect(keysAt(24)[0].midis).toEqual([57, 61, 64, 67]); // second half of bar 1: A7
    expect(keysAt(32)[0].midis).toEqual([55, 59, 62]); // bar 2: G
  });

  it("validates layers, sections and pattern lengths", () => {
    expect(() => compileSong(song({ arrangement: ["intro", "chorus"] }))).toThrow(
      /unknown section "chorus"/,
    );
    const badLayer = song();
    badLayer.sections.intro = { bars: 1, parts: [drums("cowbells", { kick: "x" })] };
    expect(() => compileSong(badLayer)).toThrow(/unknown layer "cowbells"/);
    const badLength = song();
    badLength.sections.intro = { bars: 1, parts: [notes("bass", "slapBass", "E1 . .")] };
    expect(() => compileSong(badLength, "demo")).toThrow(
      /demo\/intro part 0 \(bass\): pattern length 3 does not divide section length 16/,
    );
  });

  it("supports sections shorter than a bar (stingers)", () => {
    const stinger = compileSong({
      bpm: 140,
      loop: false,
      layers: [{ name: "lead" }],
      sections: {
        main: {
          bars: 1,
          steps: 12,
          parts: [notes("lead", "lead", "C5 - - . | . . . . | E5 . . .")],
        },
      },
      arrangement: ["main"],
    });
    expect(stinger.totalSteps).toBe(12);
  });
});

describe("songStepAt (arrangement / loop positions)", () => {
  const compiled = compileSong(song());

  it("plays the intro once, then loops the body", () => {
    expect(songStepAt(compiled, 0)).toBe(0);
    expect(songStepAt(compiled, 47)).toBe(47);
    expect(songStepAt(compiled, 48)).toBe(16);
    expect(songStepAt(compiled, 48 + 31)).toBe(47);
    expect(songStepAt(compiled, 48 + 32 * 10 + 5)).toBe(21);
  });

  it("ends non-looping songs", () => {
    const once = compileSong(song({ loop: false }));
    expect(songStepAt(once, 47)).toBe(47);
    expect(songStepAt(once, 48)).toBe(-1);
  });
});
