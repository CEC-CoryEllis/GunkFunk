/**
 * Title theme — A mixolydian, 118 BPM. A brassy two-bar fanfare (played once), then a
 * big confident groove: octave-popping bass riff, clav, horn stabs and a TV-theme hook.
 *
 * Form: fanfare (2, once) → A (4) → A' (4, horns double the hook) → B (8, IV–I–V–IV,
 * then the band-unison F–G–A "hits") → loop to A.
 */
import { bars, comp, drums, notes, REST_BAR } from "../dsl";
import type { SongDef } from "../song-types";

const A7 = "G3+C#4+E4";
const D9 = "F#3+C4+E4";
const E9 = "G#3+D4+F#4";

const FANFARE_BRASS = bars(
  "E4+A4! .   E4+A4' E4+A4' | G4+C5! -  .   E4+A4' | .   .   G4+C5' .   | A4+D5! -   -   .",
  "C5+E5! .   A4+D5' .      | C5+E5' .  A4+D5' C5+E5' | C#5+E5+A5! - - -  | -   -   -   -",
);
const FANFARE_BASS = bars(
  "A1! .   A1' A1' | G1! -   .   A1' | .   .   G1' .   | D2! -   -   .  ",
  "C2! .   D2' .   | C2' .   D2' C2' | A1! -   -   -   | -   -   E2^ G2^",
);

//          1   e   &   a   | 2   e   &   a   | 3   e   &   a   | 4   e   &   a
const RIFF = bars(
  "A1! -   .   A2^ | .   A1  G1  A1  | .   x   C2  D2  | E2^ .   D2^ C2 ",
  "A1! -   .   A2^ | .   A1  G1  A1  | .   x   E1  G1  | G#1 .   A1  x  ",
);

const HOOK = bars(
  "E5! -   .   C#5 | .   E5' .   F#5 | -   -   E5' .   | C#5 .   A4  .  ",
  "B4  -   .   A4  | .   G4  .   A4~ | -   -   -   -   | .   .   .   .  ",
  "E5! -   .   C#5 | .   E5' .   F#5 | -   -   A5' .   | G5  .   E5  .  ",
  "F#5 .   E5  .   | C#5 .   D5~ E5  | -   -   -   .   | .   .   .   .  ",
);

const STABS = bars(
  ".   .   .   .   | .   .   G4+C#5+E5! . | . . . . | . . . .",
  ".   .   .   .   | .   .   .   .   | .   .   .   .   | .   .   F#4+C5+E5! -",
);

const B_BASS = bars(
  "D2! -   .   D3^ | .   D2  C2  D2  | .   x   F2  G2  | A2^ .   G2^ F2 ",
  "D2! -   .   D3^ | .   D2  C2  D2  | .   x   A1  C2  | C#2 .   D2  x  ",
  RIFF,
  "E1! -   .   E2^ | .   E1  D2^ E1  | .   x   G1  G#1 | B1  .   D2^ E2^",
  "D2! -   .   D3^ | .   D2  C2  D2  | .   x   A1  B1  | C2  .   C#2 .  ",
  "F1! -   -   .   | .   .   G1! -   | -   -   .   .   | .   .   .   .  ",
  "A1! -   -   -   | -   -   .   .   | .   .   .   .   | E2^ x   G2^ G#2^",
);

const B_LEAD = bars(
  "F#5 -   -   .   | E5  .   D5  .   | E5  -   -   -   | .   .   .   .  ",
  ".   .   D5' E5' | F#5 .   A5  .   | F#5 -   E5  .   | D5  -   .   .  ",
  "C#5 -   -   .   | B4  .   A4  .   | B4  -   -   -   | .   .   .   .  ",
  ".   .   A4' B4' | C#5 .   E5  .   | C#5 -   B4  .   | A4  -   .   .  ",
  "G#4 -   B4  .   | D5  .   E5  .   | F#5 -   -   -   | .   .   .   .  ",
  "F#5 -   E5  .   | D5  .   C5  .   | A4  -   -   -   | .   .   .   .  ",
  "F5! .   .   .   | .   .   G5! -   | -   .   .   .   | .   .   .   .  ",
  "A5! -   -   -   | -   -   -   -   | .   .   .   .   | .   .   .   .  ",
);

const B_BRASS = bars(
  ". . . . | . . F#4+C5+E5! . | . . . . | . . . .",
  ". . . . | . . . . | . . . . | . . F#4+C5+E5! -",
  ". . . . | . . G4+C#5+E5! . | . . . . | . . . .",
  ". . . . | . . . . | . . . . | . . G4+C#5+E5! -",
  ". . . . | . . G#4+D5+F#5! . | . . . . | . . . .",
  ". . . . | . . F#4+C5+E5! . | . . . . | . . . .",
  "F4+A4+C5! . . . | . . G4+B4+D5! - | - . . . | . . . .",
  "A4+C#5+E5! - - - | - - - - | . . . . | . . . .",
);

const K1 = "X... ..x. X.x. ....";
const K2 = "X... ..x. X.x. .x..";
const SN = ".... X..g ..g. X.g.";
const HH = "xgxg xgog xgxg xgxg";
const CRASH = `x............... ${REST_BAR.repeat(3)}`;

const GROOVE = drums("drums", {
  kick: `${K1} ${K2}`,
  snare: SN,
  hat: HH,
  crash: CRASH,
});

const B_DRUMS = drums("drums", {
  kick: `${[K1, K2, K1, K2, K1, K2].join(" ")} X... ..X. .... .... X... .... .... ....`,
  snare: `${SN.repeat(6)} X... ..X. .... .... .... .... gxgx XxXX`,
  hat: `${HH.repeat(6)} ${REST_BAR} ${REST_BAR}`,
  clap: `${".... x... .... x...".repeat(6)} ${REST_BAR} ${REST_BAR}`,
  crash: `x............... ${REST_BAR.repeat(5)} x.....x......... x...............`,
  tom: `${REST_BAR.repeat(7)} .... .... x.x. ....`,
});

const CLAV = "x.kx .kx. xkx. kx.k";

export const title: SongDef = {
  bpm: 118,
  swing: 0.1,
  loop: true,
  loopTo: 1,
  layers: [
    { name: "drums", gain: 1, reverb: 0.1 },
    { name: "bass", gain: 0.85 },
    { name: "clav", gain: 0.55, reverb: 0.15, pan: -0.3 },
    { name: "brass", gain: 0.6, reverb: 0.25, pan: 0.2 },
    { name: "lead", gain: 0.65, reverb: 0.25, pan: 0.1 },
  ],
  sections: {
    fanfare: {
      bars: 2,
      parts: [
        notes("brass", "brass", FANFARE_BRASS),
        notes("bass", "slapBass", FANFARE_BASS),
        drums("drums", {
          kick: "X.xx X..x ..x. X... X.x. x.xx X... ....",
          snare: "X.xx X..x ..x. X... X.x. x.xx X... xxXX",
          crash: "x... .... .... x... x... .... x... ....",
        }),
      ],
    },
    A: {
      bars: 4,
      parts: [
        GROOVE,
        notes("bass", "slapBass", RIFF),
        comp("clav", "clav", CLAV, [A7, `${A7} ${D9}`]),
        notes("brass", "brass", STABS),
        notes("lead", "lead", HOOK),
      ],
    },
    A2: {
      bars: 4,
      parts: [
        GROOVE,
        notes("bass", "slapBass", RIFF),
        comp("clav", "clav", CLAV, [A7, `${A7} ${D9}`]),
        notes("brass", "brass", HOOK, { transpose: -12, gain: 0.8 }),
        notes("lead", "lead", HOOK),
      ],
    },
    B: {
      bars: 8,
      parts: [
        B_DRUMS,
        notes("bass", "slapBass", B_BASS),
        comp("clav", "clav", `${CLAV.repeat(6)} ${REST_BAR} ${REST_BAR}`, [
          D9,
          D9,
          A7,
          A7,
          E9,
          D9,
          D9,
          A7,
        ]),
        notes("brass", "brass", B_BRASS),
        notes("lead", "lead", B_LEAD),
      ],
    },
  },
  arrangement: ["fanfare", "A", "A2", "B"],
};
