/**
 * Character / world select — C major, 124 BPM, heavy shuffle. A bouncy 8-bar loop:
 * octave-hopping bass, four-on-the-floor, a plinky staccato hook (lead, then vibes).
 */
import { bars, comp, drums, notes } from "../dsl";
import type { SongDef } from "../song-types";

const BASS = bars(
  "C2! .   C3^ .   | x   C2  C3^ .   | C2! .   C3^ .   | x   G1  A1  Bb1",
  "A1! .   A2^ .   | x   A1  A2^ .   | A1! .   A2^ .   | x   A1  G1  F#1",
  "F1! .   F2^ .   | x   F1  F2^ .   | F1! .   F2^ .   | x   D2  E2  F#2",
  "G1! .   G2^ .   | x   G1  G2^ .   | F2^ .   D2  .   | B1  .   G1  .  ",
);

const MELODY = bars(
  "E5' .   G5' .   | C6' .   G5' .   | A5  -   G5  .   | E5  .   .   .  ",
  "C5' .   E5' .   | A5' .   E5' .   | G5  -   E5  .   | C5  .   .   .  ",
  "A4' .   C5' .   | F5' .   A5' .   | G5  -   F5  .   | D5  .   E5  .  ",
  "F5  .   E5  .   | D5  .   B4  .   | G4  -   -   -   | .   .   .   .  ",
);

const C6 = "E3+A3+C4";
const Am7 = "G3+C4+E4";
const F = "F3+A3+C4";
const G7 = "F3+G3+B3+D4";

const DRUMS = drums("drums", {
  kick: "x... x... x... x...",
  snare: ".... X... .... X..g",
  clap: ".... x... .... x...",
  hat: "..x. ..x. ..x. ..xo",
  shaker: "gxgx gxgx gxgx gxgx",
});

const shared = [
  DRUMS,
  notes("bass", "slapBass", BASS),
  comp("clav", "clav", "..x. ..xk ..x. .kx.", [C6, Am7, F, G7]),
];

export const select: SongDef = {
  bpm: 124,
  swing: 0.2,
  loop: true,
  layers: [
    { name: "drums", gain: 1, reverb: 0.1 },
    { name: "bass", gain: 0.85 },
    { name: "clav", gain: 0.55, reverb: 0.15, pan: -0.25 },
    { name: "lead", gain: 0.95, reverb: 0.25, pan: 0.15 },
    { name: "vibes", gain: 0.95, reverb: 0.3, pan: 0.2 },
  ],
  sections: {
    A: { bars: 4, parts: [...shared, notes("lead", "lead", MELODY)] },
    B: { bars: 4, parts: [...shared, notes("vibes", "vibes", MELODY, { transpose: -12 })] },
  },
  arrangement: ["A", "B"],
};
