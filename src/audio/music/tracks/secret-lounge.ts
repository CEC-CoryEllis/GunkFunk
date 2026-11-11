/**
 * Secret room joke: the sewer theme re-imagined as elevator muzak. E dorian, 90 BPM,
 * lazy swing, bossa-ish brushes and side-stick, soft upright bass, FM electric piano,
 * vibraphone playing the slap-bass hook (A) and then the sewer lead (B), organ pad.
 *
 * Form: A (4) → A + organ (4) → B (4) → B + organ (4) → loop.
 */
import { bars, comp, drums, notes } from "../dsl";
import type { SongDef } from "../song-types";
import { LEAD_A } from "./sewer";

const Em9 = "G3+B3+D4+F#4";
const A13 = "G3+C#4+F#4";

/** The sewer slap-bass hook, three octaves up and smoothed out for vibes. */
const VIBES_HOOK = bars(
  "E4  -   E5  -   | .   E4  -   E4  | G4  -   A4  -   | Bb4 B4  D5  -  ",
  "E4  -   E5  -   | .   E4  -   E5  | D5  -   B4  A4  | G4  A4  -   B4 ",
  "E4  -   E5  -   | .   E4  -   E4  | G4  -   A4  -   | Bb4 B4  D5  -  ",
  "E5  -   -   -   | D5  -   B4  -   | E4  -   -   -   | -   -   .   .  ",
);

const BASS = bars(
  "E2  -   -   -   | -   -   B1  -   | E2  -   -   -   | -   -   B1  -  ",
  "A1  -   -   -   | -   -   E2  -   | A1  -   -   -   | -   -   E2  -  ",
);

const KIT = drums("drums", {
  rim: "x..x ..x. ..x. x...",
  brush: ".... o... .... o...",
  hat: "g.g. g.g. g.g. g.g.",
  kick: "g... ..g. g... ....",
});

const BOSSA = "x-.x -.x- ..x- .x-.";
const PAD = "x--- ---- ---- ----";

const band = [KIT, notes("bass", "softBass", BASS), comp("keys", "epiano", BOSSA, [Em9, A13])];

export const secretLounge: SongDef = {
  bpm: 90,
  swing: 0.25,
  loop: true,
  layers: [
    { name: "drums", gain: 1.2, reverb: 0.2 },
    { name: "bass", gain: 0.45 },
    { name: "keys", gain: 0.95, reverb: 0.3 },
    { name: "vibes", gain: 0.85, reverb: 0.45, pan: 0.2 },
    { name: "organ", gain: 0.4, reverb: 0.4, pan: -0.2 },
  ],
  sections: {
    A: { bars: 4, parts: [...band, notes("vibes", "vibes", VIBES_HOOK)] },
    A2: {
      bars: 4,
      parts: [
        ...band,
        notes("vibes", "vibes", VIBES_HOOK),
        comp("organ", "organ", PAD, [Em9, A13]),
      ],
    },
    B: { bars: 4, parts: [...band, notes("vibes", "vibes", LEAD_A)] },
    B2: {
      bars: 4,
      parts: [...band, notes("vibes", "vibes", LEAD_A), comp("organ", "organ", PAD, [Em9, A13])],
    },
  },
  arrangement: ["A", "A2", "B", "B2"],
};
