/**
 * Projectiles in flight: flapping socks, wobbling snot globs, rubber chickens
 * with their legs dangling, and a training dummy's head (it pops off).
 * 16×16 frames centred on the projectile.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import {
  fillCapsule,
  fillCircle,
  fillEllipse,
  fillPolygon,
  fillRect,
  line,
} from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";
import { drawRatHead } from "../dummy/rat-head";

export const PROJECTILE_SHEET_KEY = "projectiles";

const sockPaint = shade(RAMPS.eyeWhite, { bias: 0.25 });
const slimePaint = shade(RAMPS.sludge, { bias: 0.15 });
const chickenPaint = shade(RAMPS.gold, { bias: 0.15 });
const stinkPaint = shade(RAMPS.sludge, { bias: -0.15 });

/** A sock flying right, toe first, its cuff flapping behind. */
function sockFrame(c: PixelCanvas, flap: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillCapsule(l, 2, 7 + flap, 10, 7, 2.6, sockPaint);
    fillEllipse(l, 12, 8.5, 3, 2.6, sockPaint);
  });
  fillRect(c, 2, 5 + flap, 1, 5, RAMPS.shorts[2]!);
  fillRect(c, 4, 5 + Math.round(flap / 2), 1, 5, RAMPS.iris[2]!);
  fillRect(c, 13, 9, 2, 2, RAMPS.eyeWhite[0]!);
}

function snotFrame(c: PixelCanvas, rx: number, ry: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, 8, 8, rx, ry, slimePaint);
    fillCircle(l, 8 - rx + 1, 8 + 1, 1.2, slimePaint); // trailing drip
  });
  c.plot(7, 6, WHITE);
  c.plot(6, 7, RAMPS.sludge[4]!);
}

function chickenFrame(c: PixelCanvas, legSwing: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, 7, 9, 5, 3, chickenPaint);
    fillCapsule(l, 10, 8, 12, 5, 1.6, chickenPaint);
    fillCircle(l, 12.5, 4.5, 2.2, chickenPaint);
    fillCircle(l, 12, 2, 1.3, RAMPS.fire[1]!);
    fillPolygon(
      l,
      [
        [14, 3.5],
        [16, 5],
        [14, 6],
      ],
      RAMPS.fire[2]!,
    );
  });
  c.plot(13, 4, OUTLINE);
  line(c, 5, 12, 4 + legSwing, 15, RAMPS.fire[2]!);
  line(c, 8, 12, 8 - legSwing, 15, RAMPS.fire[2]!);
  line(c, 4, 9, 7, 8, RAMPS.gold[1]!); // wing crease
}

/** The turnip's stink bomb: a green ball with a fizzing fuse. */
function stinkBombFrame(c: PixelCanvas, spark: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => fillCircle(l, 8, 9, 3.6, stinkPaint));
  c.plot(7, 7, RAMPS.sludge[4]!);
  c.plot(9, 11, RAMPS.sludge[0]!);
  line(c, 9, 5, 10, 3, RAMPS.pipe[2]!);
  c.plot(10, 2, spark ? WHITE : RAMPS.fire[3]!);
  if (spark) c.plot(11, 2, RAMPS.gold[3]!);
}

export function projectileSheetSpec(): SheetSpec {
  return {
    key: PROJECTILE_SHEET_KEY,
    frameWidth: 16,
    frameHeight: 16,
    originX: 8,
    originY: 8,
    animations: [
      {
        name: "sock",
        frameRate: 14,
        repeat: -1,
        frames: [0, -1, 0, 1].map((f) => (c) => sockFrame(c, f)),
      },
      {
        name: "snot",
        frameRate: 12,
        repeat: -1,
        frames: [
          [4, 4],
          [4.6, 3.5],
          [4, 4],
          [3.5, 4.6],
        ].map(
          ([rx, ry]) =>
            (c: PixelCanvas) =>
              snotFrame(c, rx!, ry!),
        ),
      },
      {
        name: "chicken",
        frameRate: 12,
        repeat: -1,
        frames: [-1, 0, 1, 0].map((f) => (c) => chickenFrame(c, f)),
      },
      { name: "dummy_head", frameRate: 1, repeat: 0, frames: [(c) => drawRatHead(c, 8, 9, "x")] },
      {
        name: "stink_bomb",
        frameRate: 12,
        repeat: -1,
        frames: [true, false].map((spark) => (c: PixelCanvas) => stinkBombFrame(c, spark)),
      },
    ],
  };
}
