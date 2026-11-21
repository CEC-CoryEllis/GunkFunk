/**
 * Bulgo's Wrecking Ball form: a taut green sphere with his spots and face.
 * Rolling is eight real pixel-art frames — the face and spots rotate around
 * the ball while the lighting stays put — plus a landing squash, a ground
 * pound, and the inflate / deflate transitions.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { overlay, shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCircle, fillEllipse, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";
import { drawEye } from "./bulgo-face";
import type { EyeStyle } from "./bulgo-pose";

export const BALL_SHEET_KEY = "bulgo-ball";
const SIZE = 40;
const CX = 20;
const GROUND = 39;
/** Radius of the fully inflated ball. */
export const BALL_RADIUS = 14.5;
/** Face and spot positions are authored for an 11.5 px ball and scaled up from there. */
const K = BALL_RADIUS / 11.5;

const skin = shade(RAMPS.mutantGreen, { bias: 0.1 });
const spotPaint = shade(RAMPS.mutantSpot, { bias: 0.1 });
const crease = RAMPS.mutantGreen[1]!;

/** Spots in ball-local polar coordinates (radius, angle, size), relative to the face. */
const SPOTS: readonly [number, number, number][] = [
  [6.5, 2.3, 2.6],
  [7.8, 3.5, 2.1],
  [5, 4.5, 1.9],
  [8.4, 1.0, 1.7],
  [3, 3.2, 1.4],
];

type Mouth = "grin" | "o" | "puff";

interface BallLook {
  /** Roll angle in radians (clockwise on screen). */
  angle: number;
  /** Squash and stretch about the ball's bottom. */
  sx: number;
  sy: number;
  /** Overall size (inflating / deflating). */
  scale: number;
  eyes: EyeStyle;
  mouth: Mouth;
  angry: boolean;
  /** 0..1 deflation creases. */
  wrinkles: number;
}

const LOOK: BallLook = {
  angle: 0,
  sx: 1,
  sy: 1,
  scale: 1,
  eyes: "open",
  mouth: "grin",
  angry: false,
  wrinkles: 0,
};

function drawBall(c: PixelCanvas, overrides: Partial<BallLook>): void {
  const b = { ...LOOK, ...overrides };
  const rx = BALL_RADIUS * b.scale * b.sx;
  const ry = BALL_RADIUS * b.scale * b.sy;
  const cy = GROUND - ry;
  const cos = Math.cos(b.angle);
  const sin = Math.sin(b.angle);
  // Ball-local point (x right, y down, unit = full-size pixels) → canvas.
  const at = (x: number, y: number): [number, number] => {
    const k = b.scale * K;
    return [CX + (x * cos - y * sin) * k * b.sx, cy + (x * sin + y * cos) * k * b.sy];
  };
  const spotCentres = SPOTS.map(([r, a, size]) => {
    const [x, y] = at(Math.cos(a) * r, Math.sin(a) * r);
    return { x, y, size: size * b.scale * K };
  });
  const inSpot = (x: number, y: number) =>
    spotCentres.some((s) => Math.hypot(x + 0.5 - s.x, y + 0.5 - s.y) <= s.size);
  outlinedLayer(c, OUTLINE, (l) =>
    fillEllipse(l, CX, cy, rx, ry, overlay(skin, inSpot, spotPaint)),
  );
  drawCreases(c, at, b.wrinkles);
  drawBallFace(c, at, b);
}

function drawCreases(
  c: PixelCanvas,
  at: (x: number, y: number) => [number, number],
  wrinkles: number,
): void {
  if (wrinkles <= 0) return;
  const creases: readonly [number, number, number, number][] = [
    [-8, -2, -3, -4],
    [-6, 5, -1, 3],
    [2, 7, 7, 5],
    [5, -8, 8, -4],
  ];
  const count = Math.ceil(wrinkles * creases.length);
  for (const [x0, y0, x1, y1] of creases.slice(0, count)) {
    const [ax, ay] = at(x0, y0);
    const [bx, by] = at(x1, y1);
    line(c, Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), crease);
  }
}

function drawBallFace(
  c: PixelCanvas,
  at: (x: number, y: number) => [number, number],
  b: BallLook,
): void {
  const [nx, ny] = at(1.5, -3.5);
  const [fx, fy] = at(6.5, -2.5);
  const look: [number, number] = [Math.cos(b.angle) * 0.6, Math.sin(b.angle) * 0.6];
  const k = b.scale * K;
  drawEye(c, fx, fy, 2.2 * k, b.eyes, look, skin, false);
  drawEye(c, nx, ny, 3 * k, b.eyes, look, skin, true);
  if (b.angry) {
    const [ax, ay] = at(-1.5, -7.5);
    const [bx, by] = at(8, -5);
    line(c, Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), OUTLINE);
  }
  const [mx, my] = at(4, 3.6);
  if (b.mouth === "o") {
    fillCircle(c, mx, my, 1.8 * k, OUTLINE);
    fillCircle(c, mx, my, 0.9 * k, RAMPS.flesh[0]!);
    return;
  }
  if (b.mouth === "puff") {
    const [ax, ay] = at(2, 3.6);
    const [bx, by] = at(6, 3.6);
    line(c, Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), OUTLINE);
    return;
  }
  // Grin: Bulgo's underbite, two fangs poking up from the lower jaw.
  fillEllipse(c, mx, my, 3.4 * k, 1.8 * k, OUTLINE, b.angle);
  fillEllipse(c, mx, my + 0.3, 2.3 * k, 0.8 * k, RAMPS.flesh[0]!, b.angle);
  for (const fangX of [2.4, 5.6]) {
    const [tx, ty] = at(fangX, 2.9);
    c.set(Math.round(tx), Math.round(ty), RAMPS.teeth[2]!);
  }
}

/** Speed lines trailing above a ground-pounding ball. */
function speedLines(c: PixelCanvas, phase: number): void {
  for (const [x, len] of [
    [13, 5],
    [18, 7],
    [23, 6],
    [27, 4],
  ] as const) {
    const top = 1 + ((x + phase * 3) % 3);
    line(c, x, top, x, top + len, phase % 2 === 0 ? WHITE : RAMPS.metal[3]!);
  }
}

/** Air rushing out of the top of a deflating ball. */
function airPuff(c: PixelCanvas, size: number, scale: number): void {
  const top = GROUND - BALL_RADIUS * 2 * scale - 1;
  fillCircle(c, CX - 1, top - size, size, WHITE);
  fillCircle(c, CX + 2, top - size * 2, size * 0.7, RAMPS.metal[4]!);
}

const frame =
  (look: Partial<BallLook>, extra?: (c: PixelCanvas) => void) =>
  (c: PixelCanvas): void => {
    drawBall(c, look);
    extra?.(c);
  };

export function ballSheetSpec(): SheetSpec {
  const roll = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => frame({ angle: (i * Math.PI) / 4 }));
  return {
    key: BALL_SHEET_KEY,
    frameWidth: SIZE,
    frameHeight: SIZE,
    originX: CX,
    originY: GROUND,
    animations: [
      {
        name: "idle",
        frameRate: 4,
        repeat: -1,
        holds: [1400, 0],
        frames: [frame({}), frame({ eyes: "blink" })],
      },
      { name: "roll", frameRate: 14, repeat: -1, frames: roll },
      {
        name: "squash",
        frameRate: 18,
        repeat: 0,
        frames: [
          frame({ sx: 1.25, sy: 0.72, eyes: "squint" }),
          frame({ sx: 0.92, sy: 1.1, eyes: "wide" }),
          frame({}),
        ],
      },
      {
        name: "slam",
        frameRate: 16,
        repeat: -1,
        frames: [0, 1].map((p) =>
          frame({ angle: 0.5, sx: 0.9, sy: 1.12, mouth: "o", angry: true }, (c) =>
            speedLines(c, p),
          ),
        ),
      },
      {
        name: "inflate",
        frameRate: 14,
        repeat: 0,
        frames: [0.55, 0.75, 1.1, 0.95, 1].map((s) =>
          frame({ scale: s, eyes: s > 1 ? "wide" : "open", mouth: s < 1 ? "puff" : "grin" }),
        ),
      },
      {
        name: "deflate",
        frameRate: 12,
        repeat: 0,
        frames: [
          frame({ scale: 1, eyes: "wide", mouth: "o", wrinkles: 0.25 }, (c) => airPuff(c, 1.5, 1)),
          frame({ scale: 0.92, sx: 1.08, sy: 0.92, mouth: "o", wrinkles: 0.5 }, (c) =>
            airPuff(c, 2.2, 0.92),
          ),
          frame(
            { scale: 0.84, sx: 0.92, sy: 1.08, eyes: "squint", mouth: "o", wrinkles: 0.75 },
            (c) => airPuff(c, 2.5, 0.84),
          ),
          frame({ scale: 0.72, sx: 1.1, sy: 0.9, eyes: "squint", mouth: "o", wrinkles: 1 }, (c) =>
            airPuff(c, 2, 0.72),
          ),
          frame({ scale: 0.62, eyes: "blink", mouth: "puff", wrinkles: 1 }),
        ],
      },
    ],
  };
}
