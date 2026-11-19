/**
 * Sewer Rat: a scrawny purple-grey rodent in a backwards cap with one gold
 * tooth. Patrols, spots you, rears up, charges — and sometimes faceplants.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEllipse, fillPolygon, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const RAT_SHEET_KEY = "enemy-rat";

const furPaint = shade(RAMPS.ratFur, { bias: 0.1 });
const bellyPaint = shade(RAMPS.ratFur, { bias: 0.35 });
const capPaint = shade(RAMPS.shorts, { bias: 0.1 });

interface RatPose {
  bob: number;
  /** Body length multiplier (charging stretches him out). */
  stretch: number;
  /** Leg animation phase, 0..1. */
  legs: number;
  /** Head height offset (negative = rearing up). */
  head: number;
  /** Whole-body tilt in radians (trip faceplant). */
  tilt: number;
  eyes: "open" | "wide" | "x";
  tail: number;
  motion?: boolean;
}

function drawRat(c: PixelCanvas, p: RatPose): void {
  const bodyY = 17 + p.bob;
  const headX = 22 + (p.stretch - 1) * 6;
  const headY = 14 + p.bob + p.head + Math.max(0, p.tilt) * 8;
  // Tail: a pink wiggle behind him.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = 7 - t * 7;
    const y = bodyY - 1 - t * 5 + Math.sin(t * 5 + p.tail) * 2;
    c.plot(Math.round(x), Math.round(y), RAMPS.flesh[2]!);
    c.plot(Math.round(x), Math.round(y) + 1, OUTLINE);
  }
  outlinedLayer(c, OUTLINE, (l) => {
    // Legs, alternating.
    for (const [lx, phase] of [
      [10, 0],
      [12, 0.5],
      [19, 0.5],
      [21, 0],
    ] as const) {
      const swing = Math.sin((p.legs + phase) * Math.PI * 2) * 2;
      fillCapsule(l, lx + (p.stretch - 1) * 4, bodyY + 2, lx + swing, 22, 1, furPaint);
    }
    fillEllipse(l, 14, bodyY, 8 * p.stretch, 5, furPaint, p.tilt);
    fillEllipse(l, 15, bodyY + 2, 5 * p.stretch, 2.5, bellyPaint, p.tilt);
    fillCircle(l, headX - 3, headY - 4, 2.6, furPaint); // ear
    fillCircle(l, headX, headY, 4.5, furPaint);
    fillPolygon(
      l,
      [
        [headX + 2, headY - 2],
        [headX + 8, headY + 2],
        [headX + 2, headY + 3.5],
      ],
      furPaint,
    );
  });
  fillCircle(c, headX - 3, headY - 4, 1.2, RAMPS.flesh[2]!);
  fillCircle(c, headX + 8, headY + 2, 1.2, RAMPS.flesh[2]!); // nose
  c.plot(headX + 4, headY + 4, RAMPS.gold[3]!); // gold tooth
  line(c, headX + 5, headY + 1, headX + 9, headY - 1, RAMPS.ratFur[3]!);
  // Backwards cap: dome on top, brim sticking out the back.
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, headX - 0.5, headY - 3.5, 3.8, 2.4, capPaint);
    fillEllipse(l, headX - 5, headY - 2.5, 2.5, 1, capPaint);
  });
  const ex = headX + 1;
  const ey = headY - 1;
  if (p.eyes === "x") {
    line(c, ex - 1, ey - 1, ex + 1, ey + 1, OUTLINE);
    line(c, ex - 1, ey + 1, ex + 1, ey - 1, OUTLINE);
  } else {
    fillCircle(c, ex, ey, p.eyes === "wide" ? 2 : 1.4, OUTLINE);
    fillCircle(
      c,
      ex,
      ey,
      p.eyes === "wide" ? 1.2 : 0.6,
      p.eyes === "wide" ? WHITE : RAMPS.shorts[2]!,
    );
  }
  if (p.motion) {
    for (const dy of [-3, 0, 3]) line(c, 0, bodyY + dy, 3, bodyY + dy, WHITE);
  }
}

const base: RatPose = { bob: 0, stretch: 1, legs: 0, head: 0, tilt: 0, eyes: "open", tail: 0 };
const vary = (o: Partial<RatPose>): RatPose => ({ ...base, ...o });

function frames(poses: RatPose[]): ((c: PixelCanvas) => void)[] {
  return poses.map((p) => (c: PixelCanvas) => drawRat(c, p));
}

export function ratSheetSpec(): SheetSpec {
  return {
    key: RAT_SHEET_KEY,
    frameWidth: 32,
    frameHeight: 24,
    originX: 16,
    originY: 23,
    animations: [
      {
        name: "walk",
        frameRate: 10,
        repeat: -1,
        frames: frames(
          [0, 0.25, 0.5, 0.75].map((t) =>
            vary({ legs: t, bob: t === 0.25 || t === 0.75 ? -1 : 0, tail: t * 6 }),
          ),
        ),
      },
      {
        name: "alert",
        frameRate: 8,
        repeat: -1,
        frames: frames([
          vary({ head: -4, eyes: "wide", bob: -1 }),
          vary({ head: -5, eyes: "wide", bob: -2 }),
        ]),
      },
      {
        name: "charge",
        frameRate: 16,
        repeat: -1,
        frames: frames(
          [0, 0.25, 0.5, 0.75].map((t) =>
            vary({ legs: t, stretch: 1.2, head: 1, motion: true, tail: t * 8 }),
          ),
        ),
      },
      {
        name: "trip",
        frameRate: 10,
        repeat: 0,
        holds: [0, 0, 400],
        frames: frames([
          vary({ tilt: 0.3, eyes: "wide" }),
          vary({ tilt: 0.55, eyes: "x", bob: 1 }),
          vary({ tilt: 0.55, eyes: "x", bob: 1 }),
        ]),
      },
      {
        name: "hurt",
        frameRate: 1,
        repeat: 0,
        frames: frames([vary({ eyes: "x", head: -2, bob: -1 })]),
      },
    ],
  };
}
