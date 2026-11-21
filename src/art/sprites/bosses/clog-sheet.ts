/**
 * THE CLOG — World 1's mini-boss: a sentient hairball the size of a car,
 * matted with gunk, glaring out through its fringe, with a rubber duck, a
 * toothbrush and a bottle cap tangled in it. Rolling frames turn the whole
 * mass (strands, junk and face) like the Wrecking Ball's.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEllipse, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";
import { drawEye } from "../bulgo/bulgo-face";
import type { EyeStyle } from "../bulgo/bulgo-pose";

export const CLOG_SHEET_KEY = "boss-clog";
const W = 72;
const H = 60;
const CX = 36;
const GROUND = H - 1;
const RX = 29;
const RY = 23;

const hairPaint = shade(RAMPS.burlap, { bias: -0.22, dither: 1.5 });
const duckPaint = shade(RAMPS.gold, { bias: 0.15 });
const brushPaint = shade(RAMPS.hotPink, { bias: 0.1 });
const capPaint = shade(RAMPS.metal, { bias: 0.1 });

type Mouth = "shut" | "open" | "wide";

interface ClogLook {
  angle: number;
  sx: number;
  sy: number;
  eyes: EyeStyle;
  mouth: Mouth;
  angry: boolean;
  /** Hair sway phase. */
  sway: number;
}

const LOOK: ClogLook = {
  angle: 0,
  sx: 1,
  sy: 1,
  eyes: "open",
  mouth: "open",
  angry: false,
  sway: 0,
};

/** Deterministic pseudo-random numbers so every frame shares the same strands. */
function rand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawClog(c: PixelCanvas, overrides: Partial<ClogLook>): void {
  const b = { ...LOOK, ...overrides };
  const rx = RX * b.sx;
  const ry = RY * b.sy;
  const cy = GROUND - ry;
  const cos = Math.cos(b.angle);
  const sin = Math.sin(b.angle);
  const at = (x: number, y: number): [number, number] => [
    CX + (x * cos - y * sin) * b.sx,
    cy + (x * sin + y * cos) * b.sy,
  ];
  // Body plus a fuzzy fringe of strands poking out of the silhouette.
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, CX, cy, rx, ry, hairPaint);
    // Curly tufts: each bends partway out, so the edge looks matted, not spiky.
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + b.angle + rand(i) * 0.15;
      const len = 2 + rand(i + 50) * 3.5;
      const ex = CX + Math.cos(a) * (rx - 1);
      const ey = cy + Math.sin(a) * (ry - 1);
      if (ey > GROUND - 3) continue;
      const bend = a + (rand(i + 70) - 0.5) * 2 + Math.sin(b.sway + i) * 0.4;
      const mx = ex + Math.cos(a) * len;
      const my = ey + Math.sin(a) * len;
      fillCapsule(l, ex, ey, mx, my, 1, hairPaint);
      fillCapsule(
        l,
        mx,
        my,
        mx + Math.cos(bend) * len * 0.8,
        my + Math.sin(bend) * len * 0.8,
        0.6,
        hairPaint,
      );
    }
  });
  drawStrands(c, at, b);
  drawJunk(c, at);
  drawFace(c, at, b);
}

/** Curly strands across the surface, light and dark. */
function drawStrands(
  c: PixelCanvas,
  at: (x: number, y: number) => [number, number],
  b: ClogLook,
): void {
  for (let i = 0; i < 130; i++) {
    const r = 0.15 + rand(i + 100) * 0.82;
    const a = rand(i + 200) * Math.PI * 2;
    const x0 = Math.cos(a) * RX * r;
    const y0 = Math.sin(a) * RY * r;
    // Each strand is a little hook: along the surface, then curling back.
    const t1 = a + Math.PI / 2 + Math.sin(b.sway * 0.7 + i) * 0.3;
    const t2 = t1 + (rand(i + 400) > 0.5 ? 1.2 : -1.2);
    const len = 2.5 + rand(i + 300) * 2.5;
    const x1 = x0 + Math.cos(t1) * len;
    const y1 = y0 + Math.sin(t1) * len;
    const x2 = x1 + Math.cos(t2) * len * 0.7;
    const y2 = y1 + Math.sin(t2) * len * 0.7;
    const pick = i % 5;
    const color =
      pick === 0
        ? RAMPS.burlap[3]!
        : pick === 1
          ? RAMPS.ratFur[2]!
          : pick === 2
            ? RAMPS.burlap[2]!
            : RAMPS.burlap[0]!;
    const [ax, ay] = at(x0, y0);
    const [bx, by] = at(x1, y1);
    const [cx2, cy2] = at(x2, y2);
    line(c, Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), color);
    line(c, Math.round(bx), Math.round(by), Math.round(cx2), Math.round(cy2), color);
  }
  // Clumps of sewer gunk.
  for (const [x, y] of [
    [-14, 10],
    [9, 14],
    [-20, -4],
  ] as const) {
    const [gx, gy] = at(x, y);
    fillCircle(c, gx, gy, 2, RAMPS.sludge[1]!);
    c.set(Math.round(gx) - 1, Math.round(gy) - 1, RAMPS.sludge[3]!);
  }
}

/** Junk tangled in the hair: a rubber duck, a toothbrush and a bottle cap. */
function drawJunk(c: PixelCanvas, at: (x: number, y: number) => [number, number]): void {
  const [dx, dy] = at(-17, -11);
  outlinedLayer(c, OUTLINE, (l) => {
    fillCircle(l, dx, dy, 3.2, duckPaint);
    fillCircle(l, dx - 2.5, dy - 3, 2, duckPaint);
  });
  c.set(Math.round(dx - 4.5), Math.round(dy - 3), RAMPS.fire[2]!);
  c.set(Math.round(dx - 3), Math.round(dy - 3.5), OUTLINE);
  const [t0x, t0y] = at(13, 9);
  const [t1x, t1y] = at(23, 3);
  outlinedLayer(c, OUTLINE, (l) => fillCapsule(l, t0x, t0y, t1x, t1y, 1, brushPaint));
  c.set(Math.round(t1x), Math.round(t1y) - 1, WHITE);
  const [kx, ky] = at(-6, 15);
  outlinedLayer(c, OUTLINE, (l) => fillCircle(l, kx, ky, 2.6, capPaint));
  c.set(Math.round(kx), Math.round(ky), RAMPS.metal[1]!);
}

function drawFace(
  c: PixelCanvas,
  at: (x: number, y: number) => [number, number],
  b: ClogLook,
): void {
  const [lx, ly] = at(5, -9);
  const [rx, ry] = at(17, -7);
  const look: [number, number] = [0.8, 0.3];
  drawEye(c, lx, ly, 4, b.eyes, look, hairPaint, true);
  drawEye(c, rx, ry, 3.4, b.eyes, look, hairPaint, false);
  // A thick hairy brow over both eyes, scowling when angry.
  const browDrop = b.angry ? 2 : 0;
  const [b0x, b0y] = at(-1, -15 + browDrop * 0.5);
  const [b1x, b1y] = at(12, -12 + browDrop);
  const [b2x, b2y] = at(22, -13 + browDrop * 0.5);
  for (const [p, q] of [
    [
      [b0x, b0y],
      [b1x, b1y],
    ],
    [
      [b1x, b1y],
      [b2x, b2y],
    ],
  ] as const) {
    fillCapsule(c, p[0], p[1], q[0], q[1], 1.6, RAMPS.burlap[0]!);
  }
  drawMouth(c, at, b);
}

function drawMouth(
  c: PixelCanvas,
  at: (x: number, y: number) => [number, number],
  b: ClogLook,
): void {
  const [mx, my] = at(12, 4);
  if (b.mouth === "shut") {
    const [ax, ay] = at(5, 4);
    const [bx, by] = at(19, 5);
    line(c, Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), OUTLINE);
    return;
  }
  const open = b.mouth === "wide" ? 6 : 3.5;
  fillEllipse(c, mx, my + open * 0.3, 8, open, OUTLINE, b.angle);
  fillEllipse(c, mx, my + open * 0.45, 6.5, open - 1.2, RAMPS.flesh[0]!, b.angle);
  // Grimy teeth along the top and a string of drool.
  for (const tx of [7, 10, 14, 17]) {
    const [px, py] = at(tx, 4 - open * 0.55);
    fillRect(c, Math.round(px), Math.round(py), 2, 2, RAMPS.teeth[1]!);
  }
  const [sx, sy] = at(15, 4 + open);
  line(c, Math.round(sx), Math.round(sy), Math.round(sx), Math.round(sy) + 3, RAMPS.sludge[3]!);
}

const frame =
  (look: Partial<ClogLook>) =>
  (c: PixelCanvas): void =>
    drawClog(c, look);

export function clogSheetSpec(): SheetSpec {
  return {
    key: CLOG_SHEET_KEY,
    frameWidth: W,
    frameHeight: H,
    originX: CX,
    originY: GROUND,
    animations: [
      {
        name: "sleep",
        frameRate: 2,
        repeat: -1,
        frames: [
          frame({ eyes: "blink", mouth: "shut" }),
          frame({ eyes: "blink", mouth: "shut", sy: 0.96, sx: 1.02, sway: 1 }),
        ],
      },
      {
        name: "idle",
        frameRate: 4,
        repeat: -1,
        frames: [0, 1, 2, 3].map((i) => frame({ sway: i * 1.5, sy: i % 2 === 0 ? 1 : 0.98 })),
      },
      {
        name: "windup",
        frameRate: 14,
        repeat: -1,
        frames: [
          frame({ sx: 1.12, sy: 0.86, eyes: "squint", angry: true, mouth: "shut" }),
          frame({ sx: 1.1, sy: 0.88, eyes: "squint", angry: true, mouth: "shut", sway: 2 }),
        ],
      },
      {
        name: "roll",
        frameRate: 12,
        repeat: -1,
        frames: [0, 1, 2, 3, 4, 5].map((i) =>
          frame({ angle: (i * Math.PI) / 3, angry: true, eyes: "wide", mouth: "shut" }),
        ),
      },
      {
        name: "spit",
        frameRate: 8,
        repeat: 0,
        frames: [
          frame({ sx: 0.96, sy: 1.06, mouth: "open", angry: true }),
          frame({ sx: 0.92, sy: 1.1, mouth: "wide", eyes: "wide", angry: true }),
          frame({ sx: 1.04, sy: 0.96, mouth: "open", angry: true }),
        ],
      },
      {
        name: "stunned",
        frameRate: 6,
        repeat: -1,
        frames: [
          frame({ sx: 1.08, sy: 0.9, eyes: "dizzy", mouth: "wide", sway: 0 }),
          frame({ sx: 1.06, sy: 0.92, eyes: "dizzy", mouth: "open", sway: 2 }),
        ],
      },
    ],
  };
}
