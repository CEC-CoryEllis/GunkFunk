/**
 * Pickups that pop out of crates, cans and vending machines: a half-eaten
 * burger (snack), a hunk of mystery meat (feast) and the Funk Gem
 * collectible hidden in secret places.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import {
  eraseEllipse,
  fillCapsule,
  fillCircle,
  fillEllipse,
  fillPolygon,
  fillRect,
  line,
} from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const ITEM_SHEET_KEY = "items";

const bunPaint = shade(RAMPS.pipe, { bias: 0.25 });
const pattyPaint = shade(RAMPS.roachShell, { bias: 0.05 });
const meatPaint = shade(RAMPS.flesh, { bias: 0.15 });
const bonePaint = shade(RAMPS.porcelain, { bias: 0.1 });

function snack(c: PixelCanvas, sparkle: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, 8, 6, 6, 3.5, bunPaint); // top bun
    fillRect(l, 2, 8, 12, 2, pattyPaint); // patty
    fillEllipse(l, 8, 11.5, 6, 2, bunPaint); // bottom bun
    eraseEllipse(l, 14.5, 7, 3, 3); // a bite out of it
  });
  for (const x of [3, 6, 9, 11]) c.plot(x, 8, RAMPS.mutantGreen[3]!); // lettuce
  fillRect(c, 4, 10, 6, 1, RAMPS.gold[3]!); // cheese drip
  c.plot(5, 4, WHITE);
  for (const [x, y] of [
    [6, 5],
    [9, 4],
    [11, 6],
  ] as const)
    c.plot(x, y, RAMPS.gold[4]!); // seeds
  if (sparkle) c.plot(2, 2, WHITE);
}

function feast(c: PixelCanvas, sparkle: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillCapsule(l, 3, 12, 6, 9, 1.5, bonePaint);
    fillCircle(l, 2.5, 12.5, 1.8, bonePaint);
    fillCircle(l, 3.5, 13.5, 1.8, bonePaint);
    fillEllipse(l, 10, 6.5, 5, 4.5, meatPaint, -0.6);
  });
  line(c, 8, 4, 12, 8, RAMPS.flesh[3]!);
  c.plot(9, 4, WHITE);
  if (sparkle) c.plot(14, 2, WHITE);
}

function gem(c: PixelCanvas, phase: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillPolygon(
      l,
      [
        [8, 1.5],
        [13.5, 6],
        [8, 14.5],
        [2.5, 6],
      ],
      RAMPS.hotPink[2]!,
    );
  });
  fillPolygon(
    c,
    [
      [8, 2.5],
      [12, 6],
      [8, 6],
    ],
    RAMPS.hotPink[3]!,
  );
  fillPolygon(
    c,
    [
      [8, 6],
      [12, 6],
      [8, 13],
    ],
    RAMPS.hotPink[1]!,
  );
  line(c, 4, 6, 12, 6, RAMPS.hotPink[3]!);
  const sparkles: readonly [number, number][] = [
    [5, 4],
    [11, 9],
    [7, 11],
    [10, 3],
  ];
  const [sx, sy] = sparkles[phase]!;
  c.plot(sx, sy, WHITE);
  c.plot(sx - 1, sy, RAMPS.hotPink[3]!);
  c.plot(sx + 1, sy, RAMPS.hotPink[3]!);
}

export function itemSheetSpec(): SheetSpec {
  return {
    key: ITEM_SHEET_KEY,
    frameWidth: 16,
    frameHeight: 16,
    originX: 8,
    originY: 8,
    animations: [
      {
        name: "snack",
        frameRate: 3,
        repeat: -1,
        frames: [false, true].map((s) => (c: PixelCanvas) => snack(c, s)),
      },
      {
        name: "feast",
        frameRate: 3,
        repeat: -1,
        frames: [false, true].map((s) => (c: PixelCanvas) => feast(c, s)),
      },
      {
        name: "gem",
        frameRate: 8,
        repeat: -1,
        frames: [0, 1, 2, 3].map((p) => (c: PixelCanvas) => gem(c, p)),
      },
    ],
  };
}
