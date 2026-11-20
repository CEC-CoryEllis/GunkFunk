/**
 * Small breakable/interactive props, all on a 24×24 frame anchored at the
 * bottom centre: a wooden crate, a toxic barrel (with a flashing fuse state),
 * a dented trash can that tips over, and a fire hydrant.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { bayer, shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEllipse, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const SMALL_PROP_SHEET_KEY = "props-small";
const GROUND = 23;

const woodPaint = shade(RAMPS.pipe, { bias: 0.05 });
const barrelPaint = shade(RAMPS.metal, { bias: -0.1 });
const canPaint = shade(RAMPS.metal, { bias: 0.1 });
const hydrantPaint = shade(RAMPS.shorts, { bias: 0.1 });

function crate(c: PixelCanvas, damaged: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => fillRect(l, 4, GROUND - 15, 16, 15, woodPaint));
  for (const y of [GROUND - 10, GROUND - 5]) line(c, 4, y, 19, y, RAMPS.pipe[0]!); // planks
  line(c, 5, GROUND - 14, 18, GROUND - 1, RAMPS.pipe[1]!); // brace
  for (const [x, y] of [
    [4, GROUND - 15],
    [19, GROUND - 15],
    [4, GROUND - 1],
    [19, GROUND - 1],
  ] as const) {
    c.set(x, y, RAMPS.metal[3]!); // corner nails
  }
  if (damaged) {
    line(c, 9, GROUND - 15, 12, GROUND - 8, OUTLINE);
    line(c, 12, GROUND - 8, 10, GROUND - 2, OUTLINE);
  }
}

function barrel(c: PixelCanvas, frame: number, fuse: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => fillRect(l, 6, GROUND - 18, 12, 18, barrelPaint));
  for (const y of [GROUND - 15, GROUND - 4]) fillRect(c, 6, y, 12, 1, RAMPS.metal[0]!); // hoops
  // Hazard band and a goofy skull.
  for (let x = 6; x < 18; x++) c.set(x, GROUND - 10, (x >> 1) % 2 === 0 ? RAMPS.gold[3]! : OUTLINE);
  fillCircle(c, 12, GROUND - 7, 2, WHITE);
  c.set(11, GROUND - 7, OUTLINE);
  c.set(13, GROUND - 7, OUTLINE);
  // Toxic goo slopping over the rim.
  for (let x = 6; x < 18; x++) {
    const drip = (x * 7 + frame * 3) % 5 === 0 ? 3 : 1;
    for (let y = 0; y < drip; y++) c.set(x, GROUND - 18 + y, RAMPS.sludge[3]!);
  }
  if (fuse) {
    for (let y = GROUND - 19; y <= GROUND; y++) {
      for (let x = 5; x <= 18; x++) {
        if (c.get(x, y) === OUTLINE && bayer(x, y) > 0.4)
          c.set(x, y, frame % 2 === 0 ? RAMPS.fire[2]! : RAMPS.fire[3]!);
      }
    }
  }
}

function trashCan(c: PixelCanvas, pose: "idle" | "wobble" | "tipped"): void {
  if (pose === "tipped") {
    outlinedLayer(c, OUTLINE, (l) => {
      fillRect(l, 3, GROUND - 10, 16, 10, canPaint);
      fillEllipse(l, 19, GROUND - 5, 2, 5, RAMPS.murk[0]!);
    });
    fillEllipse(c, 21, GROUND - 1, 2.5, 1, RAMPS.gold[3]!); // banana peel
    line(c, 15, GROUND - 2, 18, GROUND - 2, RAMPS.porcelain[2]!); // fish bone
    return;
  }
  const lean = pose === "wobble" ? 1 : 0;
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 6 + lean, GROUND - 17, 12, 17, canPaint);
    fillEllipse(l, 12 + lean * 2, GROUND - 18, 7.5, 2, canPaint); // lid
    fillRect(l, 10 + lean * 2, GROUND - 21, 4, 2, canPaint); // handle
  });
  for (const x of [9, 12, 15])
    line(c, x + lean, GROUND - 15, x + lean, GROUND - 2, RAMPS.metal[1]!);
  c.set(8 + lean, GROUND - 9, OUTLINE); // dent
}

function hydrant(c: PixelCanvas, spraying: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 7, GROUND - 4, 10, 4, hydrantPaint); // base flange
    fillRect(l, 8, GROUND - 15, 8, 12, hydrantPaint); // barrel
    fillEllipse(l, 12, GROUND - 15, 4.5, 3, hydrantPaint); // dome
    fillRect(l, 4, GROUND - 11, 4, 3, hydrantPaint); // side nozzles
    if (!spraying) fillRect(l, 16, GROUND - 11, 4, 3, hydrantPaint);
  });
  fillCircle(c, 12, GROUND - 18, 1.2, RAMPS.gold[3]!); // top nut
  if (spraying) {
    fillEllipse(c, 17, GROUND - 9.5, 1.5, 1.5, RAMPS.murk[0]!);
    fillCapsule(c, 18, GROUND - 9.5, 23, GROUND - 9.5, 1.5, RAMPS.cyan[2]!);
  } else {
    c.set(18, GROUND - 10, RAMPS.gold[3]!);
  }
}

const one = (draw: (c: PixelCanvas) => void) => [draw];

export function smallPropSheetSpec(): SheetSpec {
  return {
    key: SMALL_PROP_SHEET_KEY,
    frameWidth: 24,
    frameHeight: 24,
    originX: 12,
    originY: GROUND,
    animations: [
      { name: "crate", frameRate: 1, repeat: 0, frames: one((c) => crate(c, false)) },
      { name: "crate_hit", frameRate: 1, repeat: 0, frames: one((c) => crate(c, true)) },
      {
        name: "barrel",
        frameRate: 3,
        repeat: -1,
        frames: [0, 1].map((f) => (c: PixelCanvas) => barrel(c, f, false)),
      },
      {
        name: "barrel_fuse",
        frameRate: 14,
        repeat: -1,
        frames: [0, 1].map((f) => (c: PixelCanvas) => barrel(c, f, true)),
      },
      { name: "trash", frameRate: 1, repeat: 0, frames: one((c) => trashCan(c, "idle")) },
      {
        name: "trash_wobble",
        frameRate: 12,
        repeat: 1,
        frames: [(c) => trashCan(c, "wobble"), (c) => trashCan(c, "idle")],
      },
      { name: "trash_tipped", frameRate: 1, repeat: 0, frames: one((c) => trashCan(c, "tipped")) },
      { name: "hydrant", frameRate: 1, repeat: 0, frames: one((c) => hydrant(c, false)) },
      { name: "hydrant_spray", frameRate: 1, repeat: 0, frames: one((c) => hydrant(c, true)) },
    ],
  };
}
