/**
 * The FLUSH-O-TRON 3000 — Professor Stinkbottom's toilet mech — drawn as
 * separate parts so it can really fall apart during the fight:
 *
 *   hull    porcelain bowl + tank with a Funk Juice porthole (normal, venting,
 *           cracked, wrecked with the lid blown off)
 *   legs    hydraulic piston legs with flat clawed feet (walk, crouch, kneel)
 *   jets    rocket nozzles bolted on once the legs are gone
 *   spring  the last coil it hops around on, wrecked
 *   arm     the plunger: a tiling wooden pole and the rubber cup
 *   lid     the tank lid, for blowing off
 *
 * Everything faces right; the boss flips it to face left.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { bayer, shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { drawPixelMap } from "../../pixel/pixel-map";
import {
  fillCapsule,
  fillCircle,
  fillEgg,
  fillEllipse,
  fillPolygon,
  fillRect,
  line,
} from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const HULL_SHEET_KEY = "flushotron-hull";
export const LEGS_SHEET_KEY = "flushotron-legs";
export const JETS_SHEET_KEY = "flushotron-jets";
export const SPRING_SHEET_KEY = "flushotron-spring";
export const ARM_SHEET_KEY = "flushotron-arm";
export const LID_SHEET_KEY = "flushotron-lid";

const porcelain = shade(RAMPS.porcelain, { bias: -0.2, dither: 1.5 });
const metal = shade(RAMPS.metal, { bias: 0 });
const darkMetal = shade(RAMPS.metal, { bias: -0.3 });
const gold = shade(RAMPS.gold, { bias: 0.05 });
const wood = shade(RAMPS.pipe, { bias: 0.1 });
const rubber = shade(RAMPS.shorts, { bias: 0 });

// ── Hull ─────────────────────────────────────────────────────────────────────
export const HULL_W = 96;
export const HULL_H = 80;
const HULL_BASE = HULL_H - 1;

export type HullState = "normal" | "vent" | "cracked" | "wrecked";

const DIGITS_3000 = [
  ["eee", "..e", ".ee", "..e", "eee"],
  ["eee", "e.e", "e.e", "e.e", "eee"],
];

function hull(c: PixelCanvas, state: HullState, blink: boolean): void {
  const wrecked = state === "wrecked";
  outlinedLayer(c, OUTLINE, (l) => {
    // Tank at the back, bowl in front, a metal undercarriage below both.
    fillRect(l, 10, wrecked ? 20 : 10, 30, wrecked ? 38 : 48, porcelain);
    if (!wrecked) fillRect(l, 7, 6, 36, 6, porcelain); // lid
    fillEgg(l, 58, 52, 24, 22, 14, porcelain);
    fillEllipse(l, 58, 40, 27, 6, porcelain); // seat rim
    fillRect(l, 14, 62, 70, 12, metal);
    fillRect(l, 22, 74, 54, 5, darkMetal);
    // Exhaust stacks.
    fillRect(l, 14, wrecked ? 10 : 0, 5, wrecked ? 12 : 8, darkMetal);
    fillRect(l, 31, wrecked ? 12 : 2, 5, wrecked ? 10 : 6, darkMetal);
  });
  // The open seat where the professor sits.
  fillEllipse(c, 60, 40, 21, 3.5, RAMPS.murk[0]!);
  // Warning stripes on the undercarriage, rivets.
  for (let x = 15; x < 83; x++) {
    if (((x >> 2) & 1) === 0) c.set(x, 64, RAMPS.gold[3]!);
    else c.set(x, 64, OUTLINE);
  }
  for (const x of [18, 34, 50, 66, 80]) c.set(x, 69, RAMPS.metal[4]!);
  // Gold trim, the flush lever and a "3000" plate on the bowl.
  line(c, 36, 47, 82, 47, RAMPS.gold[2]!);
  outlinedLayer(c, OUTLINE, (l) => fillRect(l, 40, 22, 6, 3, gold));
  outlinedLayer(c, OUTLINE, (l) => fillRect(l, 55, 52, 18, 9, gold));
  for (const [i, map] of [
    DIGITS_3000[0]!,
    DIGITS_3000[1]!,
    DIGITS_3000[1]!,
    DIGITS_3000[1]!,
  ].entries()) {
    drawPixelMap(c, 57 + i * 4, 54, map, { e: OUTLINE });
  }
  drawCore(c, state, blink);
  drawGauge(c, 33, 30, blink);
  if (state === "vent" || blink) {
    // Status light on the bowl.
    c.set(82, 50, state === "vent" ? RAMPS.fire[3]! : RAMPS.sludge[4]!);
  }
  if (state === "cracked" || wrecked) drawCracks(c, wrecked);
  if (wrecked) {
    // Juice sloshing in the open tank, scorch marks.
    fillRect(c, 11, 21, 28, 3, RAMPS.sludge[3]!);
    line(c, 11, 21, 38, 21, RAMPS.sludge[4]!);
    for (const [x, y] of [
      [70, 44],
      [44, 60],
      [24, 50],
    ] as const) {
      fillCircle(c, x, y, 2.5, RAMPS.murk[1]!);
    }
  }
}

/** The Funk Juice porthole: dim normally, blazing (with open vents) when venting. */
function drawCore(c: PixelCanvas, state: HullState, blink: boolean): void {
  const cx = 25;
  const cy = state === "wrecked" ? 40 : 36;
  fillCircle(c, cx, cy, 8, OUTLINE);
  fillCircle(c, cx, cy, 7, metal);
  const bright = state === "vent";
  fillCircle(c, cx, cy, 5, bright ? RAMPS.sludge[4]! : RAMPS.sludge[2]!);
  fillCircle(c, cx - 1, cy - 1, 2.5, bright ? WHITE : blink ? RAMPS.sludge[4]! : RAMPS.sludge[3]!);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.set(Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7), RAMPS.metal[3]!);
  }
  if (!bright) return;
  // Vents in the undercarriage blasting steam.
  for (const x of [26, 44, 62]) {
    fillRect(c, x, 66, 8, 3, OUTLINE);
    for (let y = 56; y < 66; y++) {
      for (let dx = 0; dx < 8; dx++) {
        if (bayer(x + dx, y) > (66 - y) / 12) c.set(x + dx, y, WHITE);
      }
    }
  }
}

function drawGauge(c: PixelCanvas, x: number, y: number, flip: boolean): void {
  fillCircle(c, x, y, 3.5, OUTLINE);
  fillCircle(c, x, y, 2.5, WHITE);
  line(c, x, y, x + (flip ? 2 : -1), y - 2, RAMPS.shorts[2]!);
}

function drawCracks(c: PixelCanvas, heavy: boolean): void {
  const cracks: readonly [number, number, number, number][] = [
    [44, 44, 50, 52],
    [50, 52, 47, 60],
    [70, 38, 76, 46],
    [14, 30, 20, 38],
  ];
  for (const [x0, y0, x1, y1] of heavy ? cracks : cracks.slice(0, 2)) {
    line(c, x0, y0, x1, y1, OUTLINE);
    line(c, x0 + 1, y0, x1 + 1, y1, RAMPS.porcelain[0]!);
  }
}

// ── Legs ─────────────────────────────────────────────────────────────────────
export const LEGS_W = 96;
export const LEGS_H = 48;

/** `lift` raises one foot (walk cycle); `squat` folds both knees (crouch / kneel). */
function legs(c: PixelCanvas, leftLift: number, rightLift: number, squat: number): void {
  const ground = LEGS_H - 1;
  for (const [hipX, lift] of [
    [30, leftLift],
    [66, rightLift],
  ] as const) {
    const footY = ground - 4 - lift;
    const kneeX = hipX + 6 + squat * 8;
    const kneeY = 4 + (footY - 4) * 0.45 + squat * 4;
    outlinedLayer(c, OUTLINE, (l) => {
      fillCapsule(l, hipX, 3, kneeX, kneeY, 5, metal);
      fillCapsule(l, kneeX, kneeY, hipX, footY - 2, 4, darkMetal);
      fillCircle(l, kneeX, kneeY, 4.5, metal);
      fillRect(l, hipX - 10, footY - 3, 22, 5, metal); // foot
      for (const t of [-10, -4, 2, 8])
        fillPolygon(
          l,
          [
            [hipX + t, footY + 2],
            [hipX + t + 3, footY + 2],
            [hipX + t + 1, footY + 4],
          ],
          darkMetal,
        );
    });
    // Hydraulic piston glint and hazard stripe.
    line(c, Math.round(hipX + 2), 5, Math.round(kneeX + 1), Math.round(kneeY - 2), RAMPS.metal[4]!);
    c.set(Math.round(kneeX), Math.round(kneeY), RAMPS.gold[3]!);
  }
}

// ── Jets, spring, arm, lid ───────────────────────────────────────────────────
export const JETS_W = 96;
export const JETS_H = 32;

function jets(c: PixelCanvas, flicker: number): void {
  for (const x of [32, 64]) {
    outlinedLayer(c, OUTLINE, (l) => {
      fillPolygon(
        l,
        [
          [x - 7, 0],
          [x + 7, 0],
          [x + 5, 8],
          [x - 5, 8],
        ],
        metal,
      );
    });
    const len = 14 + ((flicker + x) % 3) * 4;
    for (let y = 9; y < 9 + len; y++) {
      const t = (y - 9) / len;
      const half = Math.max(1, Math.round((1 - t) * 5));
      for (let dx = -half; dx <= half; dx++) {
        const hot = Math.abs(dx) < half * 0.5 && t < 0.6;
        c.set(x + dx, y, hot ? WHITE : t < 0.5 ? RAMPS.fire[3]! : RAMPS.fire[2]!);
      }
    }
  }
}

export const SPRING_W = 96;
export const SPRING_H = 40;

function spring(c: PixelCanvas, stretch: number): void {
  const bottom = SPRING_H - 1;
  const height = 18 + stretch * 16;
  const coils = 5;
  outlinedLayer(c, OUTLINE, (l) => {
    for (let i = 0; i < coils; i++) {
      const y = bottom - 4 - ((i + 0.5) / coils) * height;
      fillEllipse(l, 48, y, 14, 2.4, metal);
    }
    fillRect(l, 30, bottom - 4, 36, 5, darkMetal);
  });
}

export const ARM_POLE = 8;

function pole(c: PixelCanvas): void {
  fillRect(c, 0, 1, ARM_POLE, 4, RAMPS.pipe[2]!);
  line(c, 0, 0, ARM_POLE - 1, 0, OUTLINE);
  line(c, 0, 5, ARM_POLE - 1, 5, OUTLINE);
  line(c, 0, 2, ARM_POLE - 1, 2, RAMPS.pipe[3]!);
}

function cup(c: PixelCanvas, squash: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 0, 10, 8, 4, wood);
    fillEllipse(l, 14, 12, 7 - squash, 8 + squash, rubber);
  });
  fillEllipse(c, 21 - squash, 12, 2, 6 + squash, RAMPS.shorts[0]!);
  c.set(12, 8, RAMPS.shorts[3]!);
}

function lid(c: PixelCanvas): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 1, 3, 30, 6, porcelain);
    fillRect(l, 12, 0, 8, 4, porcelain);
  });
}

// ── Stomp shockwave ─────────────────────────────────────────────────────────
export const SHOCKWAVE_SHEET_KEY = "flushotron-shockwave";

/** A curling wave of sewer grime rolling along the floor, crest leading right. */
function shockwave(c: PixelCanvas, phase: number): void {
  const ground = 15;
  outlinedLayer(c, OUTLINE, (l) => {
    fillPolygon(
      l,
      [
        [2, ground],
        [16 + phase, ground - 9 - phase],
        [24, ground - 6],
        [29, ground],
      ],
      shade(RAMPS.sludge, { bias: -0.1 }),
    );
  });
  line(c, 14 + phase, ground - 8 - phase, 22, ground - 6, RAMPS.sludge[4]!);
  for (const x of [6, 11, 25]) c.set(x, ground - 2 - ((x + phase) % 3), RAMPS.sludge[4]!);
}

export function shockwaveSheetSpec(): SheetSpec {
  return {
    key: SHOCKWAVE_SHEET_KEY,
    frameWidth: 32,
    frameHeight: 16,
    originX: 16,
    originY: 15,
    animations: [
      {
        name: "roll",
        frameRate: 12,
        repeat: -1,
        frames: [0, 1, 2].map((p) => (c: PixelCanvas) => shockwave(c, p)),
      },
    ],
  };
}

// ── Sheet specs ──────────────────────────────────────────────────────────────
export function hullSheetSpec(): SheetSpec {
  const states: readonly HullState[] = ["normal", "vent", "cracked", "wrecked"];
  return {
    key: HULL_SHEET_KEY,
    frameWidth: HULL_W,
    frameHeight: HULL_H,
    originX: HULL_W / 2,
    originY: HULL_BASE,
    animations: states.map((state) => ({
      name: state,
      frameRate: state === "vent" ? 10 : 3,
      repeat: -1,
      frames: [false, true].map((blink) => (c: PixelCanvas) => hull(c, state, blink)),
    })),
  };
}

export function legsSheetSpec(): SheetSpec {
  return {
    key: LEGS_SHEET_KEY,
    frameWidth: LEGS_W,
    frameHeight: LEGS_H,
    originX: LEGS_W / 2,
    originY: LEGS_H - 1,
    animations: [
      { name: "stand", frameRate: 1, repeat: 0, frames: [(c) => legs(c, 0, 0, 0)] },
      {
        name: "walk",
        frameRate: 6,
        repeat: -1,
        frames: [
          (c) => legs(c, 6, 0, 0.1),
          (c) => legs(c, 2, 0, 0),
          (c) => legs(c, 0, 6, 0.1),
          (c) => legs(c, 0, 2, 0),
        ],
      },
      { name: "crouch", frameRate: 1, repeat: 0, frames: [(c) => legs(c, 0, 0, 0.7)] },
      { name: "kneel", frameRate: 1, repeat: 0, frames: [(c) => legs(c, 0, 0, 1.4)] },
    ],
  };
}

export function jetsSheetSpec(): SheetSpec {
  return {
    key: JETS_SHEET_KEY,
    frameWidth: JETS_W,
    frameHeight: JETS_H,
    originX: JETS_W / 2,
    originY: 0,
    animations: [
      {
        name: "burn",
        frameRate: 16,
        repeat: -1,
        frames: [0, 1, 2].map((f) => (c: PixelCanvas) => jets(c, f)),
      },
    ],
  };
}

export function springSheetSpec(): SheetSpec {
  return {
    key: SPRING_SHEET_KEY,
    frameWidth: SPRING_W,
    frameHeight: SPRING_H,
    originX: SPRING_W / 2,
    originY: SPRING_H - 1,
    animations: [
      { name: "squashed", frameRate: 1, repeat: 0, frames: [(c) => spring(c, 0)] },
      { name: "sprung", frameRate: 1, repeat: 0, frames: [(c) => spring(c, 1)] },
    ],
  };
}

export function armSheetSpec(): SheetSpec {
  return {
    key: ARM_SHEET_KEY,
    frameWidth: 24,
    frameHeight: 24,
    originX: 0,
    originY: 12,
    animations: [
      { name: "pole", frameRate: 1, repeat: 0, frames: [(c) => pole(c)] },
      { name: "cup", frameRate: 1, repeat: 0, frames: [(c) => cup(c, 0)] },
      { name: "cup_splat", frameRate: 1, repeat: 0, frames: [(c) => cup(c, 1)] },
    ],
  };
}

export function lidSheetSpec(): SheetSpec {
  return {
    key: LID_SHEET_KEY,
    frameWidth: 32,
    frameHeight: 12,
    originX: 16,
    originY: 6,
    animations: [{ name: "lid", frameRate: 1, repeat: 0, frames: [lid] }],
  };
}
