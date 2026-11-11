/**
 * "Sewer of Doom" — World 1 stage theme. E dorian, 110 BPM, light 16th swing.
 * The slap-bass riff IS the hook; clav scratches; a goofy pulse lead (intensity ≥ 1);
 * fuzz guitar + hand percussion (intensity 2). A bass-break section shows off.
 *
 * Form: intro (2, once) → A (4) → A+fill (4) → B (8) → break (4) → A' (4) → A'+fill (4) → loop to A.
 */
import { bars, comp, drums, notes, REST_BAR, REST_NOTES } from "../dsl";
import type { DrumsPart, SectionDef, SongDef } from "../song-types";

// Rootless clav voicings – the bass owns the roots.
const Em9 = "G3+B3+D4+F#4";
const A13 = "G3+C#4+F#4";
const C9 = "E3+Bb3+D4+G4";
const D9 = "F#3+C4+E4+A4";
const B7s9 = "D#3+A3+D4";

// ── Bass ────────────────────────────────────────────────────────────────
//         1   e   &   a   | 2   e   &   a   | 3   e   &   a   | 4   e   &   a
export const HOOK = bars(
  "E1! .   E2^ x   | .   E1  x   E1  | G1  .   A1  .   | Bb1 B1h D2^ .  ",
  "E1! .   E2^ x   | .   E1  x   E2^ | D2^ .   B1  A1  | G1  A1~ x   B1 ",
);

const B_BASS = bars(
  "A1! .   A2^ x   | .   A1  x   A1  | C2  .   D2  .   | Eb2 E2h G2^ .  ",
  "A1! .   A2^ x   | .   A1  x   A2^ | G2^ .   E2  D2  | C2  D2~ x   E2 ",
  HOOK,
  "C2! .   C3^ x   | .   C2  x   C2  | E2  .   G2  .   | Bb2 x   C3^ .  ",
  "D2! .   D3^ x   | .   D2  x   D2  | F#2 .   A2  .   | C3^ x   D3^ .  ",
  "B1! .   B2^ x   | .   B1  x   B1  | B1  .   B2^ .   | A2^ .   F#2 .  ",
  "B1! .   B2^ x   | B1  B2^ B1  B2^ | D#2 .   F#2 .   | A2^ .   B2^ -  ",
);

const BREAK_BASS = bars(
  "E1! x   x   E2^ | x   E1  E2^ x   | E1  x   E2^ E1  | G1  G#1h A1  .  ",
  "E1! x   x   E2^ | x   E1  E2^ x   | D2^ C#2^ B1 A1  | G1  E1  G1  A1~",
  "E1! x   x   E2^ | x   E1  E2^ x   | E1  x   E2^ E1  | Bb1 B1h D2^ E2^",
  "E1! E2^ E1  E2^ | x   E2^ x   E2^ | D2^ B1  A1  G1  | E1  .   E2^ x  ",
);

// ── Lead (the goofy hook) ───────────────────────────────────────────────
export const LEAD_A = bars(
  "E4' .   E4' G4  | .   E4' .   D4  | E4  -   -   .   | .   .   .   .  ",
  "E4' .   E4' G4  | .   A4~ .   G4  | E4  .   D4  .   | B3~ -   -   .  ",
  "E4' .   E4' G4  | .   E4' .   D4  | E4  -   -   .   | .   C#5' B4' A4",
  "G4  .   E4  .   | D4  .   E4~ -   | -   -   -   -   | .   .   .   .  ",
);

const LEAD_A2 = bars(
  "E5' .   E5' G5  | .   E5' .   D5  | E5  -   -   .   | .   .   .   .  ",
  "E5' .   E5' G5  | .   A5~ .   G5  | E5  .   D5  .   | B4~ -   -   .  ",
  "G4' .   G4' B4  | .   G4' .   A4  | B4  -   -   .   | .   D5' C#5' B4",
  "A4  .   G4  .   | E4  .   G4~ -   | -   -   E4  -   | -   -   .   .  ",
);

const LEAD_B = bars(
  "C#5 -   -   .   | B4  .   A4  .   | B4  -   -   -   | -   -   .   .  ",
  ".   .   E4' F#4'| A4  .   B4~ -   | -   -   .   .   | .   .   .   .  ",
  "D5  -   -   .   | B4  .   A4  .   | G4  -   -   -   | -   -   .   .  ",
  ".   .   E4' F#4'| G4  .   A4~ -   | -   -   .   .   | .   .   .   .  ",
  "G4  -   E4  .   | G4  .   A4  -   | Bb4 -   -   .   | .   .   .   .  ",
  "A4  -   F#4 .   | A4  .   B4  -   | C5  -   -   .   | .   .   .   .  ",
  "D#5 -   -   -   | -   -   -   .   | D5  -   -   -   | -   -   -   .  ",
  "C5  .   B4  .   | A4  .   F#4 .   | D#4 -   -   -   | .   .   .   .  ",
);

// ── Fuzz guitar (intensity 2) ───────────────────────────────────────────
const GTR_A = bars(
  "E2! -   -   .   | .   .   .   E2' | .   .   G2' .   | A2' .   B2  -  ",
  "E2! -   -   .   | .   .   .   E2' | D3  -   .   B2  | A2  .   G2  .  ",
);
const stab = (root: string) => `${root}! - - - | - - . ${root}' | . . ${root}' . | . . . .`;
const GTR_B = bars(...["A2", "A2", "E2", "E2", "C3", "D3", "B2", "B2"].map(stab));
const GTR_BREAK = bars("E2! - - - | - - - - | . . . . | . . . .", REST_NOTES);

// ── Drums ───────────────────────────────────────────────────────────────
const K1 = "X... .x.. X.x. ....";
const K2 = "X... .x.. X.x. ..x.";
const SN = ".... X..g .g.. X..g";
const HH = "xgxg xgxg xgxg xgog";
const KF = "X... .x.. X... ....";
const SF = ".... X..g gxgx ....";
const HF = "xgxg xgxg .... ....";
const CRASH = `x............... ${REST_BAR.repeat(3)}`;

function groove(fill: boolean, clap = false): DrumsPart {
  const last = (normal: string, filled: string) => (fill ? filled : normal);
  return drums("drums", {
    kick: [K1, K2, K1, last(K2, KF)].join(" "),
    snare: [SN, SN, SN, last(SN, SF)].join(" "),
    hat: [HH, HH, HH, last(HH, HF)].join(" "),
    crash: CRASH,
    ...(clap ? { clap: ".... x... .... x..." } : {}),
    ...(fill
      ? {
          tom: `${REST_BAR.repeat(3)} .... .... .... Xx..`,
          tomLo: `${REST_BAR.repeat(3)} .... .... .... ..XX`,
        }
      : {}),
  });
}

const PERC = drums("perc", {
  cowbell: "x... .... x... ..x.",
  conga: "..x. .xx. ..x. .x.x",
  congaLo: "x... .... x.x. ....",
  shaker: "gxgx gxgx gxgx gxgx",
});

// ── Clav ────────────────────────────────────────────────────────────────
const CLAV = "..xk x-kx .kx. kx.k";
const CLAV_BUSY = ".kxk x.kx .kxk x.kx";

const bass = (pattern: string) => notes("bass", "slapBass", pattern);

function aSection(fill: boolean, lead: string, clav: string, clap: boolean): SectionDef {
  return {
    bars: 4,
    parts: [
      groove(fill, clap),
      bass(HOOK),
      comp("clav", "clav", clav, [Em9, `${Em9} ${A13}`]),
      notes("lead", "lead", lead),
      notes("guitar", "distGuitar", GTR_A),
      PERC,
    ],
  };
}

export const sewer: SongDef = {
  bpm: 110,
  swing: 0.14,
  loop: true,
  loopTo: 1,
  layers: [
    { name: "drums", gain: 1, reverb: 0.1 },
    { name: "bass", gain: 1 },
    { name: "clav", gain: 0.5, reverb: 0.15, pan: -0.3 },
    { name: "lead", from: 1, gain: 0.7, reverb: 0.25, pan: 0.15 },
    { name: "guitar", from: 2, gain: 0.42, reverb: 0.08, pan: 0.35 },
    { name: "perc", from: 2, gain: 1, reverb: 0.12, pan: 0.25 },
  ],
  sections: {
    intro: {
      bars: 2,
      parts: [
        bass(HOOK),
        drums("drums", {
          hat: "x.x. x.x. x.x. x.x.",
          kick: `${REST_BAR} X... .... X... ....`,
          snare: `${REST_BAR} .... .... .... gxXX`,
        }),
      ],
    },
    A: aSection(false, LEAD_A, CLAV, false),
    Afill: aSection(true, LEAD_A, CLAV, false),
    B: {
      bars: 8,
      parts: [
        drums("drums", {
          kick: [K1, K2, K1, K2, K1, K2, K1, KF].join(" "),
          snare: [SN, SN, SN, SN, SN, SN, SN, SF].join(" "),
          hat: "xgxg xgog xgxg xgog",
          clap: ".... x... .... x...",
          crash: `${CRASH} ${REST_BAR.repeat(4)}`,
          tom: `${REST_BAR.repeat(7)} .... .... .... Xx..`,
          tomLo: `${REST_BAR.repeat(7)} .... .... .... ..XX`,
        }),
        bass(B_BASS),
        comp("clav", "clav", CLAV, [A13, A13, Em9, Em9, C9, D9, B7s9, B7s9]),
        notes("lead", "lead", LEAD_B),
        notes("guitar", "distGuitar", GTR_B),
        PERC,
      ],
    },
    break: {
      bars: 4,
      parts: [
        drums("drums", {
          kick: "X... .... ..X. ....",
          snare: ".... .... X... ....",
          hat: "x.x. x.x. x.x. x.o.",
          crash: CRASH,
        }),
        bass(BREAK_BASS),
        notes("guitar", "distGuitar", GTR_BREAK),
        drums("perc", { conga: "..x. .xx. ..x. .x.x", congaLo: "x... .... x.x. ...." }),
      ],
    },
    A2: aSection(false, LEAD_A2, CLAV_BUSY, true),
    A2fill: aSection(true, LEAD_A2, CLAV_BUSY, true),
  },
  arrangement: ["intro", "A", "Afill", "B", "break", "A2", "A2fill"],
};
