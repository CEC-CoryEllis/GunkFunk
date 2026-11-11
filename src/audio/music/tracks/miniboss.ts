/**
 * Mini-boss ("The Clog") — B phrygian-minor, 128 BPM, straight 16ths. Pumping slap
 * 16ths with octave pops and the flat-2 (C) for tension, palm-muted fuzz chugs,
 * diminished horn stabs and a creepy chromatic lead.
 *
 * Form: A (4) → A' (4, lead up an octave) → B (4, G–F# climb) → loop.
 */
import { bars, comp, drums, notes } from "../dsl";
import type { SongDef } from "../song-types";

const BASS_A = bars(
  "B1! B1  B2^ B1  | x   B1  B2^ B1  | B1! B1  B2^ B1  | C2  C2  B1  A1 ",
  "B1! B1  B2^ B1  | x   B1  B2^ B1  | D2! D2  D3^ D2  | C2! C2  C3^ C2 ",
);
const BASS_B = bars(
  "G1! G1  G2^ G1  | x   G1  G2^ G1  | F#1! F#1 F#2^ F#1 | x  F#1 F#2^ F#1",
  "G1! G1  G2^ G1  | x   G1  G2^ G1  | A#1! .  B1  .   | C2! .   C#2 .  ",
);

const GTR_A = bars(
  "B2' B2' .   B2' | .   B2' B2' .   | B2' B2' .   B2' | C3! -   B2! -  ",
  "B2' B2' .   B2' | .   B2' B2' .   | D3! -   -   .   | C3! -   -   .  ",
);
const GTR_B = bars(
  "G2' G2' .   G2' | .   G2' G2' .   | F#2' F#2' . F#2' | . F#2' F#2' .  ",
  "G2' G2' .   G2' | .   G2' G2' .   | A#2! -  B2! -   | C3! -   C#3! - ",
);

const BRASS = bars(
  ". . . . | . . . . | . . . . | D4+F4+B4! - . .",
  ". . . . | . . . . | F4+A4+D5! - . . | E4+G4+C5! - . .",
);

const LEAD_A = bars(
  "F#4 -   -   -   | G4  -   -   -   | F#4 -   -   -   | F4  -   E4  -  ",
  "F#4 -   -   -   | G4  -   A4  -   | Bb4 -   A4  -   | G4  -   F#4 -  ",
);
const LEAD_B = bars(
  "B4  -   -   -   | -   -   A4  -   | A#4 -   -   -   | -   -   .   .  ",
  "B4  -   C5  -   | C#5 -   D5  -   | D#5 -   -   -   | E5  -   F5~ -  ",
);

const KIT = drums("drums", {
  kick: "X... x... X... x.x.",
  snare: ".... X... .... X...",
  hat: "xxXx xxXx xxXx xxXx",
});
const KIT_B = drums("drums", {
  kick: "X... x... X... x.x. X... x... X... ....",
  snare: ".... X... .... X... .... X... gxgx XXXX",
  hat: "xxXx xxXx xxXx xxXx xxXx xxXx .... ....",
  crash: "x............... ................",
  tom: "................ ........ .... x.x.",
});

const CLAV = "kkxk kkxk kkxk kkxk";

export const miniboss: SongDef = {
  bpm: 128,
  loop: true,
  layers: [
    { name: "drums", gain: 1, reverb: 0.08 },
    { name: "bass", gain: 0.78 },
    { name: "guitar", gain: 0.4, reverb: 0.05, pan: 0.3 },
    { name: "clav", gain: 0.5, reverb: 0.1, pan: -0.35 },
    { name: "brass", gain: 0.72, reverb: 0.2, pan: -0.1 },
    { name: "lead", gain: 0.45, reverb: 0.3, pan: 0.1 },
  ],
  sections: {
    A: {
      bars: 4,
      parts: [
        KIT,
        notes("bass", "slapBass", BASS_A),
        notes("guitar", "distGuitar", GTR_A),
        comp("clav", "clav", CLAV, ["B3+D4+F#4"]),
        notes("brass", "brass", BRASS),
        notes("lead", "lead", LEAD_A),
      ],
    },
    A2: {
      bars: 4,
      parts: [
        KIT,
        notes("bass", "slapBass", BASS_A),
        notes("guitar", "distGuitar", GTR_A),
        comp("clav", "clav", CLAV, ["B3+D4+F#4"]),
        notes("brass", "brass", BRASS),
        notes("lead", "lead", LEAD_A, { transpose: 12, gain: 0.8 }),
      ],
    },
    B: {
      bars: 4,
      parts: [
        KIT_B,
        notes("bass", "slapBass", BASS_B),
        notes("guitar", "distGuitar", GTR_B),
        comp("clav", "clav", CLAV, ["G3+B3+D4", "F#3+A#3+C#4"]),
        notes("lead", "lead", LEAD_B),
      ],
    },
  },
  arrangement: ["A", "A2", "B"],
};
