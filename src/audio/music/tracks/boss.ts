/**
 * Boss — Professor Stinkbottom's Flush-o-Tron 3000. E minor funk-rock, 140 BPM, straight.
 * Layers escalate with the boss phases:
 *   0: drums + pounding slap bass + fuzz-guitar riff
 *   1: + horror organ + horn stabs
 *   2: + screaming lead + cowbell / 16th hats / crashes
 *
 * Form: intro hit (1, once) → A (4) → A (4) → B (4, C–D–Bb–B half-time) → A + fill (4) → loop.
 */
import { bars, drums, notes, REST_BAR } from "../dsl";
import type { SectionDef, SongDef } from "../song-types";

//              1   e   &   a   | 2   e   &   a   | 3   e   &   a   | 4   e   &   a
const RIFF_GTR = bars(
  "E2! .   .   E2' | .   E2' G2  .   | E2' .   A2  .   | Bb2 A2  G2  .  ",
  "E2! .   .   E2' | .   E2' G2  .   | E2' .   D3  .   | C#3 C3  B2  .  ",
);
const RIFF_BASS = bars(
  "E1! x   E2^ E1  | x   E1  G1  x   | E1  x   A1  x   | Bb1 A1  G1  x  ",
  "E1! x   E2^ E1  | x   E1  G1  x   | E1  x   D2^ x   | C#2^ C2^ B1 x  ",
);
const ORGAN_A = bars(
  "E4+G4+B4 - - - | - - - - | - - - - | - - - -",
  "E4+G4+C5 - - - | - - - - | E4+A4+C#5 - - - | - - - -",
);
const BRASS_A = bars(
  ". . . . | . . . . | . . . . | E4+G4+Bb4! - . .",
  ". . . . | . . . . | . . . . | E4+A4+C#5! - E4+G4+B4! .",
);
const LEAD_A = bars(
  "B5! -   -   -   | -   -   A5  G5  | A5  -   -   -   | Bb5 -   B5~ -  ",
  "-   -   -   -   | -   -   .   .   | E5' G5' A5' B5' | D6  -   C#6 -  ",
  "B5! -   -   -   | -   -   A5  G5  | A5  -   -   -   | G5  -   E5~ -  ",
  "-   -   -   -   | -   -   .   .   | E5' D5' B4' G4' | A4  -   Bb4 -  ",
);

const B_GTR = bars(
  "C3! -   -   -   | -   -   -   -   | -   -   .   C3' | C3' .   .   .  ",
  "D3! -   -   -   | -   -   -   -   | -   -   .   D3' | D3' .   .   .  ",
  "Bb2! -  -   -   | -   -   -   -   | -   -   .   Bb2' | Bb2' . .   .  ",
  "B2! -   -   -   | -   -   -   -   | B2' B2' B2' B2' | B2' B2' B2' B2'",
);
const B_BASS = bars(
  "C2! .   C3^ .   | C2  .   C3^ .   | C2  .   C3^ .   | C2  x   C3^ x  ",
  "D2! .   D3^ .   | D2  .   D3^ .   | D2  .   D3^ .   | D2  x   D3^ x  ",
  "Bb1! .  Bb2^ .  | Bb1 .   Bb2^ .  | Bb1 .   Bb2^ .  | Bb1 x   Bb2^ x ",
  "B1! .   B2^ .   | B1  .   B2^ .   | B1  B1  B2^ B1  | B2^ B1  B2^ B2^",
);
const B_ORGAN = bars(
  "C4+E4+G4 - - - | - - - - | - - - - | - - - -",
  "D4+F#4+A4 - - - | - - - - | - - - - | - - - -",
  "Bb3+D4+F4 - - - | - - - - | - - - - | - - - -",
  "B3+D#4+F#4 - - - | - - - - | - - - - | - - - -",
);
const B_BRASS = bars(
  "C4+G4+C5! - - . | . . . . | . . . . | . . . .",
  "D4+A4+D5! - - . | . . . . | . . . . | . . . .",
  "Bb3+F4+Bb4! - - . | . . . . | . . . . | . . . .",
  "B3+F#4+B4! - - . | . . . . | . . . . | B3+D#4+F#4! . B3+D#4+F#4! .",
);
const B_LEAD = bars(
  "G5  -   -   -   | -   -   -   -   | E5  -   G5  -   | C6  -   -   -  ",
  "A5  -   -   -   | -   -   -   -   | F#5 -   A5  -   | D6  -   -   -  ",
  "F5  -   -   -   | -   -   -   -   | D5  -   F5  -   | Bb5 -   -   -  ",
  "F#5 -   -   -   | -   -   -   -   | D#5 -   F#5 -   | B5  -   -   -  ",
);

const KICK = "X..x ..x. X.x. ....";
const SNARE = ".... X..g .... X.g.";
const HATS = "x.x. x.x. x.x. x.x.";

function aSection(fill: boolean): SectionDef {
  const lastBar = (normal: string, filled: string) =>
    `${normal.repeat(3)} ${fill ? filled : normal}`;
  return {
    bars: 4,
    parts: [
      drums("drums", {
        kick: lastBar(KICK, "X..x ..x. X... ...."),
        snare: lastBar(SNARE, ".... X..g xxxx XXXX"),
        hat: lastBar(HATS, "x.x. x.x. .... ...."),
      }),
      notes("bass", "slapBass", RIFF_BASS),
      notes("guitar", "distGuitar", RIFF_GTR),
      notes("organ", "organ", ORGAN_A),
      notes("brass", "brass", BRASS_A),
      notes("lead", "lead", LEAD_A),
      drums("perc", {
        hat: "gxgx gxgx gxgx gxgx",
        cowbell: "x.x. x.x. x.x. x.x.",
        crash: `x............... ${REST_BAR} x............... ${REST_BAR}`,
      }),
    ],
  };
}

export const boss: SongDef = {
  bpm: 140,
  loop: true,
  loopTo: 1,
  layers: [
    { name: "drums", gain: 1, reverb: 0.08 },
    { name: "bass", gain: 1 },
    { name: "guitar", gain: 0.45, reverb: 0.06, pan: 0.25 },
    { name: "organ", from: 1, gain: 0.32, reverb: 0.35, pan: -0.3 },
    { name: "brass", from: 1, gain: 0.67, reverb: 0.2, pan: -0.15 },
    { name: "lead", from: 2, gain: 0.45, reverb: 0.3, pan: 0.15 },
    { name: "perc", from: 2, gain: 1, reverb: 0.1, pan: -0.2 },
  ],
  sections: {
    intro: {
      bars: 1,
      parts: [
        notes("guitar", "distGuitar", "E2! - - - | - - - - | - - - - | . . . ."),
        notes("bass", "slapBass", "E1! - - - | - - - - | - - - - | . . E2^ E2^"),
        drums("drums", {
          kick: "X... .... .... ....",
          crash: "x... .... .... ....",
          snare: ".... .... gxgx XXXX",
        }),
      ],
    },
    A: aSection(false),
    Afill: aSection(true),
    B: {
      bars: 4,
      parts: [
        drums("drums", {
          kick: "X... .... ..X. ....",
          snare: `${".... .... X... ....".repeat(3)} .... .... xxxx XXXX`,
          hat: HATS,
          crash: `x............... ${REST_BAR.repeat(3)}`,
        }),
        notes("bass", "slapBass", B_BASS),
        notes("guitar", "distGuitar", B_GTR),
        notes("organ", "organ", B_ORGAN),
        notes("brass", "brass", B_BRASS),
        notes("lead", "lead", B_LEAD),
        drums("perc", { hat: "gxgx gxgx gxgx gxgx", crash: `x............... ${REST_BAR}` }),
      ],
    },
  },
  arrangement: ["intro", "A", "A", "B", "Afill"],
};
