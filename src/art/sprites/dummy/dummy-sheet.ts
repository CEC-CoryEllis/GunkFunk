/**
 * "Crash-Test Rat" training dummy: a stitched burlap sack with a bullseye
 * belly and a rat head in a hard hat, bolted to a spring. It wobbles, takes a
 * beating, loses its head and boings back up.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEgg, fillEllipse, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";
import { type DummyEyes, drawRatHead } from "./rat-head";

export const DUMMY_SHEET_KEY = "dummy";
const W = 36;
const H = 46;
const CX = 18;
const GROUND = 45;

const burlapPaint = shade(RAMPS.burlap, { bias: 0.1 });
const metalPaint = shade(RAMPS.metal, { bias: 0.05 });

interface DummyPose {
  /** Horizontal offset at the top of the dummy; the spring bends to match. */
  lean: number;
  /** Vertical squash of the spring and body (1 = rest). */
  squash: number;
  eyes: DummyEyes;
  headless?: boolean;
  /** 0 = body hidden in the base (respawn start), 1 = fully up. */
  rise?: number;
}

function drawSpring(c: PixelCanvas, top: number, lean: number): void {
  const bottom = GROUND - 3;
  const coils = 5;
  let px = CX;
  let py = bottom;
  for (let i = 1; i <= coils * 2; i++) {
    const t = i / (coils * 2);
    const x = CX + lean * t + (i % 2 === 0 ? -4 : 4);
    const y = bottom - (bottom - top) * t;
    line(c, px, py, x, y, RAMPS.metal[3]!);
    line(c, px, py + 1, x, y + 1, RAMPS.metal[1]!);
    px = x;
    py = y;
  }
}

function drawDummy(c: PixelCanvas, p: DummyPose): void {
  outlinedLayer(c, OUTLINE, (l) => fillEllipse(l, CX, GROUND - 2, 10, 2.5, metalPaint));
  const rise = p.rise ?? 1;
  const bodyBottom = GROUND - 4 - 12 * p.squash * rise;
  drawSpring(c, bodyBottom, p.lean * 0.5);
  if (rise <= 0) {
    // Just a tuft of stuffing stuck in the spring.
    fillCircle(c, CX + 1, bodyBottom - 1, 2.5, OUTLINE);
    fillCircle(c, CX + 1, bodyBottom - 1, 1.6, WHITE);
    return;
  }
  const bx = CX + p.lean * 0.75;
  const by = bodyBottom - 8 * p.squash;
  outlinedLayer(c, OUTLINE, (l) => {
    fillCapsule(l, bx - 6, by - 3, bx - 10, by + 2 + p.lean * 0.2, 2.2, burlapPaint); // floppy arms
    fillCapsule(l, bx + 6, by - 3, bx + 10, by + 2 - p.lean * 0.2, 2.2, burlapPaint);
    fillEgg(l, bx, by, 6.5, 8.5, 8.5 * p.squash, burlapPaint);
  });
  // Bullseye belly and a stitched seam.
  for (const [r, color] of [
    [4, RAMPS.fire[1]!],
    [3, WHITE],
    [2, RAMPS.fire[1]!],
    [1, WHITE],
  ] as const) {
    fillCircle(c, bx - 1, by + 1, r, color);
  }
  for (let y = Math.round(by - 7); y < by + 7; y += 2) c.plot(Math.round(bx + 4), y, OUTLINE);
  if (!p.headless) drawRatHead(c, bx + p.lean * 0.3, by - 12 * p.squash, p.eyes);
  else {
    fillCircle(c, bx, by - 9, 2.5, OUTLINE);
    fillCircle(c, bx, by - 9, 1.6, WHITE); // stuffing where the head was
  }
}

function frames(poses: DummyPose[]): ((c: PixelCanvas) => void)[] {
  return poses.map((p) => (c: PixelCanvas) => drawDummy(c, p));
}

export function dummySheetSpec(): SheetSpec {
  return {
    key: DUMMY_SHEET_KEY,
    frameWidth: W,
    frameHeight: H,
    originX: CX,
    originY: GROUND,
    animations: [
      {
        name: "idle",
        frameRate: 5,
        repeat: -1,
        frames: frames(
          [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6].map((lean) => ({ lean, squash: 1, eyes: "button" })),
        ),
      },
      {
        name: "hit",
        frameRate: 16,
        repeat: 0,
        holds: [40, 0, 0, 0],
        frames: frames([
          { lean: 7, squash: 0.82, eyes: "x" },
          { lean: 4, squash: 0.92, eyes: "wide" },
          { lean: -3, squash: 1.06, eyes: "wide" },
          { lean: 1, squash: 1, eyes: "button" },
        ]),
      },
      {
        name: "slimed",
        frameRate: 6,
        repeat: -1,
        frames: frames([
          { lean: 0, squash: 0.95, eyes: "x" },
          { lean: 0.5, squash: 0.94, eyes: "x" },
        ]),
      },
      {
        name: "broken",
        frameRate: 1,
        repeat: 0,
        frames: frames([{ lean: 0, squash: 1, eyes: "x", rise: 0 }]),
      },
      {
        name: "rise",
        frameRate: 14,
        repeat: 0,
        frames: frames([
          { lean: 0, squash: 0.5, eyes: "wide", rise: 0.4 },
          { lean: 0, squash: 1.2, eyes: "wide", rise: 1 },
          { lean: 0, squash: 0.9, eyes: "button", rise: 1 },
          { lean: 0, squash: 1, eyes: "button", rise: 1 },
        ]),
      },
    ],
  };
}
