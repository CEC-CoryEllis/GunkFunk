/**
 * One-shot musical cues. Each is a single non-looping section; its length in
 * 16th steps (at its own tempo) sets how long the song underneath is ducked.
 */
import type { StingerId } from "../../audio-types";
import { drums, notes } from "../dsl";
import type { LayerDef, PartDef, SongDef } from "../song-types";

const LAYERS: readonly LayerDef[] = [
  { name: "drums", gain: 0.85, reverb: 0.15 },
  { name: "bass", gain: 1 },
  { name: "lead", gain: 0.55, reverb: 0.3, pan: 0.1 },
  { name: "brass", gain: 0.7, reverb: 0.25, pan: -0.1 },
  { name: "keys", gain: 0.75, reverb: 0.4, pan: 0.15 },
  { name: "guitar", gain: 0.45, reverb: 0.1, pan: 0.25 },
];

function stinger(bpm: number, steps: number, parts: PartDef[], tail = 1.2): SongDef {
  return {
    bpm,
    loop: false,
    tail,
    layers: LAYERS,
    sections: { main: { bars: Math.ceil(steps / 16), steps, parts } },
    arrangement: ["main"],
  };
}

export const STINGERS: Record<StingerId, SongDef> = {
  // "Bwa-bwa-bwa-BWAAAH": two-octave Em7 run up into the Hendrix chord. ~1.7 s
  transform: stinger(140, 16, [
    notes("lead", "lead", "E4' G4' B4' D5' | E5' G5' B5' D6~ | E6! - - - | - - - ."),
    notes("bass", "slapBass", "E1! E2^ E1 E2^ | E1 E2^ G2^ A2^ | E1! - - - | - - . ."),
    notes("brass", "brass", ". . . . | . . . . | E4+G#4+D5+G5! - - - | - - - -"),
    drums("drums", {
      snare: "gggx gxxX X... ....",
      kick: "X... .... X... ....",
      crash: ".... .... x... ....",
    }),
  ]),

  // Bright G-major sweep. ~1.2 s
  powerup: stinger(150, 12, [
    notes("lead", "lead", "G4' B4' D5' G5' | B5' D6' G6! - | - - - ."),
    notes("keys", "vibes", "G4 B4 D5 G5 | B5 D6 G6 - | - - - -"),
    notes("bass", "slapBass", "G1! . G2^ . | G1 . G2^ . | G2^ - . ."),
    drums("drums", { hat: "xxxx xxxx x...", kick: "X... .... X...", crash: ".... .... x..." }),
  ]),

  // Sparkly E-major-7 shimmer resolving up. ~2.1 s
  rare_powerup: stinger(140, 20, [
    notes("lead", "lead", "E5' B4' E5' G#5' | B5' G#5' B5' E6' | D#6! - - - | E6! - - - | - - - ."),
    notes(
      "keys",
      "vibes",
      "E5 G#5 B5 D#6 | E5 G#5 B5 D#6 | B5+D#6+F#6 - - - | B5+E6+G#6 - - - | - - - -",
    ),
    notes(
      "brass",
      "brass",
      ". . . . | . . . . | E4+G#4+B4+D#5! - - - | E4+G#4+C#5+E5! - - - | - - - -",
    ),
    notes("bass", "slapBass", "E1! . E2^ . | B1 . E2^ . | E1! - - - | E2^ - - - | - - . ."),
    drums("drums", {
      kick: "X... X... X... X... ....",
      snare: ".... .... x... X... ....",
      crash: ".... .... x... x... ....",
      shaker: "gxgx gxgx gxgx gxgx ....",
    }),
  ]),

  // "Huh...? OH!" — augmented arpeggio resolving a step down to B major 7. ~2 s
  secret_found: stinger(120, 16, [
    notes("keys", "vibes", "C5' E5' G#5' C6' | E6' G#6' . . | B5+D#6+F#6+A#6 - - - | - - - -"),
    notes("keys", "organ", ". . . . | . . . . | B3+D#4+F#4+A#4 - - - | - - - -"),
    notes("bass", "slapBass", ". . . . | . . . . | B1! . B2^ x | B1 . . ."),
    drums("drums", {
      rim: "x..x ..x. .... ....",
      crash: ".... .... g... ....",
      shaker: "gxgx gxgx .... ....",
    }),
  ]),

  // Horn fanfare with a power-chord landing. ~1.7 s
  weapon_get: stinger(140, 16, [
    notes("brass", "brass", "D4+F#4' . D4+F#4' . | G4+B4! . . . | A4+C#5+E5! - - - | - - - -"),
    notes("guitar", "distGuitar", "D3' . D3' . | G2! . . . | A2! - - - | - - - -"),
    notes("bass", "slapBass", "D2' . D2' . | G1! . . . | A1! - - - | - - - ."),
    drums("drums", {
      kick: "X.x. X... X... ....",
      snare: "X.x. X... X... ....",
      crash: ".... x... x... ....",
    }),
  ]),

  // Cheeky bouncing 1-up. ~1.6 s
  extra_life: stinger(150, 16, [
    notes("lead", "lead", "G5' . G5' A5' | . C6' . . | A5' . C6' D6' | E6! - - ."),
    notes("bass", "slapBass", "C2! . C3^ . | . C2 . . | F2 . F3^ . | C3^ - - ."),
    notes("keys", "vibes", "C5+E5 . . . | . . . . | F5+A5 . . . | G5+C6+E6 - - -"),
    drums("drums", {
      kick: "X... ..x. X... X...",
      snare: ".... X... .... X...",
      hat: "x.x. x.x. x.x. x...",
      crash: ".... .... .... x...",
    }),
  ]),

  // "DUN... DUN... DUNNN" + tom roll into the boss theme. ~2.5 s
  boss_intro: stinger(
    120,
    20,
    [
      notes("guitar", "distGuitar", "E2! - - . | F2! - - . | E2! - - - | - - - - | - - - -"),
      notes("bass", "slapBass", "E1! - - . | F1! - - . | E1! - - - | - - - - | - - - -"),
      notes("brass", "brass", ". . . . | . . . . | E3+G3+Bb3+C#4!v - - - | - - - - | - - - -"),
      drums("drums", {
        kick: "X... X... X... .... ....",
        crash: "x... x... x... .... ....",
        tom: ".... .... .... x.x. x.x.",
        tomLo: ".... .... .... .x.x .x.X",
      }),
    ],
    1.5,
  ),

  // Funky victory fanfare, ending on a big E9. ~4 s
  level_clear: stinger(
    120,
    32,
    [
      notes(
        "brass",
        "brass",
        "B4' . B4' D5 | . E5! - . | D5' B4' . A4 | B4 - G4 . | A4' B4' D5' E5' | G#4+D5+F#5+B5! - - - | - - - - | - - - .",
      ),
      notes(
        "lead",
        "lead",
        "B5' . B5' D6 | . E6! - . | D6' B5' . A5 | B5 - G5 . | A5' B5' D6' E6' | . . . . | E6~ - - - | - - - .",
      ),
      notes(
        "bass",
        "slapBass",
        "E1! . E2^ x | . E1 x E2^ | G1 . A1 . | B1 . D2^ . | A1' B1' D2' E2^ | E1! - - - | - - - - | - - E2^ .",
      ),
      drums("drums", {
        kick: "X... .x.. X.x. .... x.x. X... .... ....",
        snare: ".... X..g .g.. X..g x.x. X... .... ....",
        hat: "xgxg xgxg xgxg xgog .... .... .... ....",
        crash: ".... .... .... .... .... x... .... ....",
      }),
    ],
    1.8,
  ),

  // Sad trombone: "wah… wah… wah… waaaaah". ~3 s
  game_over: stinger(100, 20, [
    notes("brass", "trombone", "D4w - - . | C#4w - - . | C4w - - . | B3w~ - - - | - - - -"),
    notes("bass", "softBass", "D2 - - . | C#2 - - . | C2 - - . | B1 - - - | - - - ."),
  ]),

  // Slide-whistle plummet over a chromatic slap tumble. ~1.5 s
  death: stinger(120, 12, [
    notes("lead", "lead", "C6v - - - | - - - - | . . . ."),
    notes("bass", "slapBass", "G2^ F#2^ F2^ E2^ | Eb2 D2 Db2 C2 | C2! - . ."),
    drums("drums", { tom: "x... ..x. ....", tomLo: ".... .... X...", kick: ".... .... X..." }),
  ]),
};
