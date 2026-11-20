/**
 * Large props on a 32×48 frame anchored at the bottom centre: the
 * Snack-O-Matic vending machine, the launch toilet (with its geyser), a floor
 * vent fan and the moving sewer platform.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { bayer, shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCircle, fillEllipse, fillPolygon, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const LARGE_PROP_SHEET_KEY = "props-large";
const W = 32;
const GROUND = 47;

const casePaint = shade(RAMPS.shorts, { bias: 0.05 });
const porcelain = shade(RAMPS.porcelain, { bias: 0.05 });
const metalPaint = shade(RAMPS.metal, { bias: 0 });

const SNACK_COLOURS = [
  RAMPS.gold[3]!,
  RAMPS.mutantGreen[3]!,
  RAMPS.hotPink[2]!,
  RAMPS.cyan[2]!,
  RAMPS.fire[2]!,
];

function vending(c: PixelCanvas, frame: number, cracked: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 3, GROUND - 44, 26, 42, casePaint);
    fillRect(l, 4, GROUND - 2, 4, 2, metalPaint); // feet
    fillRect(l, 24, GROUND - 2, 4, 2, metalPaint);
  });
  // Marquee lights along the top.
  for (let x = 5; x < 27; x += 2)
    c.set(x, GROUND - 42, (x + frame) % 4 < 2 ? RAMPS.gold[4]! : RAMPS.gold[1]!);
  // Window full of snacks.
  fillRect(c, 5, GROUND - 39, 16, 26, OUTLINE);
  fillRect(c, 6, GROUND - 38, 14, 24, RAMPS.murk[2]!);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const color = SNACK_COLOURS[(row * 3 + col) % SNACK_COLOURS.length]!;
      fillRect(c, 7 + col * 4, GROUND - 37 + row * 6, 3, 4, color);
    }
    line(c, 6, GROUND - 32 + row * 6, 19, GROUND - 32 + row * 6, RAMPS.metal[2]!); // shelves
  }
  c.set(7, GROUND - 37, WHITE); // glass glint
  // Buttons, coin slot and the dispenser flap.
  for (let i = 0; i < 4; i++)
    fillRect(c, 23, GROUND - 37 + i * 4, 3, 2, i === frame % 4 ? RAMPS.gold[3]! : RAMPS.metal[2]!);
  fillRect(c, 24, GROUND - 19, 1, 4, OUTLINE);
  fillRect(c, 7, GROUND - 9, 14, 5, OUTLINE);
  fillRect(c, 8, GROUND - 8, 12, 3, RAMPS.murk[0]!);
  if (cracked) {
    line(c, 8, GROUND - 36, 13, GROUND - 28, WHITE);
    line(c, 13, GROUND - 28, 11, GROUND - 20, WHITE);
    line(c, 13, GROUND - 28, 18, GROUND - 25, WHITE);
  }
}

function launchToilet(c: PixelCanvas, geyser: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 6, GROUND - 26, 9, 14, porcelain); // tank
    fillPolygon(
      l,
      [
        [12, GROUND],
        [24, GROUND],
        [22, GROUND - 7],
        [14, GROUND - 7],
      ],
      porcelain,
    );
    fillEllipse(l, 19, GROUND - 10, 10, 4, porcelain); // bowl
    fillRect(l, 7, GROUND - 30, 3, 8, porcelain); // raised lid
  });
  fillRect(c, 15, GROUND - 24, 3, 1, RAMPS.gold[3]!); // golden flush lever
  fillEllipse(c, 20, GROUND - 11, 7, 1.6, RAMPS.cyan[1]!); // water
  if (geyser > 0) {
    const top = GROUND - 11 - geyser;
    for (let y = top; y < GROUND - 11; y++) {
      const wobble = Math.round(Math.sin(y * 0.6 + geyser) * 1.2);
      for (let x = 17 + wobble; x <= 23 + wobble; x++) {
        c.set(x, y, bayer(x, y) > 0.65 ? WHITE : RAMPS.cyan[2]!);
      }
    }
    fillEllipse(c, 20, top, 5, 2.5, WHITE);
  } else {
    c.set(17, GROUND - 11, WHITE); // bubble
  }
}

function fan(c: PixelCanvas, phase: number): void {
  const top = GROUND - 9;
  outlinedLayer(c, OUTLINE, (l) => fillRect(l, 2, top, 28, 9, metalPaint));
  fillRect(c, 4, top + 2, 24, 6, RAMPS.murk[0]!);
  // Spinning blades seen through the grate.
  for (let b = 0; b < 3; b++) {
    const a = phase * 0.7 + (b * Math.PI * 2) / 3;
    line(
      c,
      16,
      top + 5,
      Math.round(16 + Math.cos(a) * 10),
      Math.round(top + 5 + Math.sin(a) * 2.5),
      RAMPS.metal[2]!,
    );
  }
  for (let x = 4; x < 28; x += 3) line(c, x, top + 2, x, top + 7, RAMPS.metal[1]!); // grate bars
  c.set(16, top + 5, RAMPS.gold[3]!);
}

function platform(c: PixelCanvas): void {
  const top = GROUND - 8;
  outlinedLayer(c, OUTLINE, (l) => fillRect(l, 0, top, W, 7, metalPaint));
  for (let x = 1; x < W - 1; x++) c.set(x, top + 5, (x >> 1) % 2 === 0 ? RAMPS.gold[3]! : OUTLINE);
  for (const x of [3, 15, 28]) c.set(x, top + 2, RAMPS.metal[4]!); // rivets
  fillCircle(c, 9, top + 3, 1, RAMPS.rust[1]!); // rust spot
}

export function largePropSheetSpec(): SheetSpec {
  return {
    key: LARGE_PROP_SHEET_KEY,
    frameWidth: W,
    frameHeight: 48,
    originX: 16,
    originY: GROUND,
    animations: [
      {
        name: "vending",
        frameRate: 4,
        repeat: -1,
        frames: [0, 1, 2, 3].map((f) => (c: PixelCanvas) => vending(c, f, false)),
      },
      {
        name: "vending_cracked",
        frameRate: 4,
        repeat: -1,
        frames: [0, 2].map((f) => (c: PixelCanvas) => vending(c, f, true)),
      },
      { name: "toilet", frameRate: 1, repeat: 0, frames: [(c) => launchToilet(c, 0)] },
      {
        name: "toilet_flush",
        frameRate: 16,
        repeat: 0,
        frames: [6, 16, 26, 34, 30, 18, 6].map((g) => (c: PixelCanvas) => launchToilet(c, g)),
      },
      {
        name: "fan",
        frameRate: 20,
        repeat: -1,
        frames: [0, 1, 2].map((p) => (c: PixelCanvas) => fan(c, p * 3)),
      },
      { name: "platform", frameRate: 1, repeat: 0, frames: [(c) => platform(c)] },
    ],
  };
}
