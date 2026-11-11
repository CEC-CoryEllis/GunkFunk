/**
 * Bulgo's body rig: turns a `BulgoPose` into one frame of pixels.
 *
 * Anatomy (facing right): a gorilla torso far too big for two stubby legs,
 * a head sunk between the shoulders, Popeye forearms with oversized fists,
 * red gym shorts and purple high-tops. Parts are drawn back-to-front, each on
 * its own outlined layer.
 */
import { OUTLINE, RAMPS } from "../../palettes";
import { type Paint, overlay, shade } from "../../pixel/paint";
import { PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEgg, fillEllipse, line } from "../../pixel/shapes";
import { type HeadShape, drawEye, drawFace } from "./bulgo-face";
import type { ArmPose, BulgoPose, FootPose } from "./bulgo-pose";
import { drawProps } from "./bulgo-props";

export const BULGO_FRAME = { width: 64, height: 48, originX: 22, originY: 46 } as const;

const UPPER_ARM = 7;
const FOREARM = 7;

const skinPaint = shade(RAMPS.mutantGreen);
const backSkinPaint = shade(RAMPS.mutantGreen, { bias: -0.18 });
const headPaint = shade(RAMPS.mutantGreen, { bias: 0.06 });
const shortsPaint = shade(RAMPS.shorts);
const sneakerPaint = shade(RAMPS.sneaker, { bias: 0.1 });
const bandPaint = shade(RAMPS.sweatband, { bias: 0.1 });

interface Point {
  x: number;
  y: number;
}

interface Skeleton {
  cx: number;
  cy: number;
  rxTop: number;
  rxBottom: number;
  ry: number;
  hipY: number;
  head: HeadShape;
  frontShoulder: Point;
  backShoulder: Point;
  frontFoot: Point;
  backFoot: Point;
}

function buildSkeleton(p: BulgoPose): Skeleton {
  const cx = BULGO_FRAME.originX + p.x;
  const hipY = BULGO_FRAME.originY - 8 + p.y;
  const ry = 11.5 * p.sy;
  const cy = hipY - ry;
  const torsoTop = cy - ry;
  const groundY = BULGO_FRAME.originY - 2;
  return {
    cx,
    cy,
    rxTop: 13 * p.sx,
    rxBottom: 9 * p.sx,
    ry,
    hipY,
    head: { cx: cx + 9 + p.lean, cy: torsoTop + 2 + p.headDrop, rx: 10, ry: 9.5 },
    frontShoulder: { x: cx + 4 * p.sx + p.lean * 0.3, y: cy + 1 * p.sy },
    backShoulder: { x: cx - 8 * p.sx, y: cy - 4 * p.sy },
    frontFoot: footAt(cx + 4, groundY, p.frontFoot),
    backFoot: footAt(cx - 4, groundY, p.backFoot),
  };
}

function footAt(x: number, y: number, foot: FootPose): Point {
  return { x: x + foot.dx, y: y + foot.dy };
}

function armJoints(shoulder: Point, arm: ArmPose): { elbow: Point; hand: Point } {
  const elbow = {
    x: shoulder.x + Math.sin(arm.a1) * UPPER_ARM,
    y: shoulder.y + Math.cos(arm.a1) * UPPER_ARM,
  };
  const reach = FOREARM * (arm.stretch ?? 1);
  const angle = arm.a1 + arm.a2;
  return {
    elbow,
    hand: { x: elbow.x + Math.sin(angle) * reach, y: elbow.y + Math.cos(angle) * reach },
  };
}

function drawArm(canvas: PixelCanvas, shoulder: Point, arm: ArmPose, front: boolean): void {
  const { elbow, hand } = armJoints(shoulder, arm);
  const paint = front ? skinPaint : backSkinPaint;
  outlinedLayer(canvas, OUTLINE, (layer) => {
    fillCapsule(layer, shoulder.x, shoulder.y, elbow.x, elbow.y, front ? 3.4 : 3, paint);
    fillCapsule(layer, elbow.x, elbow.y, hand.x, hand.y, front ? 3.8 : 3.3, paint);
    if (front) {
      // Sweatband just above the wrist.
      const bx = elbow.x + (hand.x - elbow.x) * 0.62;
      const by = elbow.y + (hand.y - elbow.y) * 0.62;
      fillCapsule(
        layer,
        bx,
        by,
        elbow.x + (hand.x - elbow.x) * 0.8,
        elbow.y + (hand.y - elbow.y) * 0.8,
        3.9,
        bandPaint,
      );
    }
    fillCircle(layer, hand.x, hand.y, (front ? 4.6 : 3.9) * (arm.fist ?? 1), paint);
  });
  // Knuckle creases on the front fist.
  if (front) {
    const r = 4.6 * (arm.fist ?? 1);
    const dir = Math.sign(Math.sin(arm.a1 + arm.a2)) || 1;
    const kx = Math.round(hand.x + dir * r * 0.45);
    line(canvas, kx, Math.round(hand.y - 1), kx, Math.round(hand.y + 1), RAMPS.mutantGreen[1]!);
  }
}

function drawLeg(canvas: PixelCanvas, hip: Point, foot: Point, front: boolean): void {
  outlinedLayer(canvas, OUTLINE, (layer) => {
    fillCapsule(layer, hip.x, hip.y, foot.x, foot.y - 1, 2.2, front ? skinPaint : backSkinPaint);
    fillEllipse(layer, foot.x + 1.5, foot.y - 0.5, 4, 2.4, sneakerPaint);
    // White toe cap and sole stripe.
    fillEllipse(layer, foot.x + 4, foot.y - 0.5, 1.5, 1.6, RAMPS.sneaker[3]!);
  });
}

function torsoPaint(s: Skeleton): Paint {
  const spots: readonly [number, number, number][] = [
    [-7, -5, 2.4],
    [-9.5, 2, 1.7],
    [-2, -8.5, 1.7],
    [-4.5, 4.5, 1.3],
    [2, 1, 1],
  ];
  const inSpot = (x: number, y: number) =>
    spots.some(
      ([dx, dy, r]) => (x + 0.5 - (s.cx + dx)) ** 2 + (y + 0.5 - (s.cy + dy)) ** 2 <= r * r,
    );
  const inBelly = (x: number, y: number) =>
    ((x + 0.5 - (s.cx + 5)) / 6.5) ** 2 + ((y + 0.5 - (s.cy + 4)) / 6.5) ** 2 <= 1;
  const bellyPaint = shade(RAMPS.mutantGreen, { bias: 0.28 });
  return overlay(overlay(skinPaint, inBelly, bellyPaint), inSpot, shade(RAMPS.mutantSpot));
}

function drawTorso(canvas: PixelCanvas, s: Skeleton): void {
  outlinedLayer(canvas, OUTLINE, (layer) => {
    fillEgg(layer, s.cx, s.cy, s.rxTop, s.rxBottom, s.ry, torsoPaint(s));
  });
  outlinedLayer(canvas, OUTLINE, (layer) => {
    const top = s.hipY - 5;
    const waistband = overlay(shortsPaint, (_x, y) => y <= top + 0.5, shade(RAMPS.sweatband));
    fillEgg(layer, s.cx, s.hipY - 1, s.rxBottom + 0.5, s.rxBottom - 0.5, 4.2, waistband);
  });
}

function drawHead(canvas: PixelCanvas, s: Skeleton, p: BulgoPose): void {
  const { head } = s;
  outlinedLayer(canvas, OUTLINE, (layer) => {
    fillEgg(layer, head.cx, head.cy, head.rx - 1.5, head.rx + 0.5, head.ry, headPaint);
    drawFace(layer, head, p, headPaint);
  });
  // Three-hair sprout, drawn after outlining so the strands stay 1 px thin.
  const topY = Math.round(head.cy - head.ry - 0.5);
  const sway = Math.round(p.hair);
  for (const [dx, h] of [
    [-3, 3],
    [-1, 4],
    [1, 3],
  ] as const) {
    const x = Math.round(head.cx + dx);
    line(canvas, x, topY, x + sway, topY - h, OUTLINE);
    canvas.plot(x + sway + 1, topY - h, OUTLINE);
  }
}

function rotateQuarterTurns(
  source: PixelCanvas,
  turns: number,
  cx: number,
  cy: number,
): PixelCanvas {
  const out = new PixelCanvas(source.width, source.height);
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const color = source.get(x, y);
      if (color === 0) {
        continue;
      }
      let dx = x - cx;
      let dy = y - cy;
      for (let i = 0; i < turns; i++) {
        [dx, dy] = [-dy, dx];
      }
      out.set(Math.round(cx + dx), Math.round(cy + dy), color);
    }
  }
  return out;
}

/** What's left of Bulgo after a fatal mishap: goo, shorts and two worried eyes. */
function drawPuddle(canvas: PixelCanvas, p: BulgoPose): void {
  const cx = BULGO_FRAME.originX + 2;
  const groundY = BULGO_FRAME.originY - 3;
  outlinedLayer(canvas, OUTLINE, (layer) => {
    fillEllipse(layer, cx, groundY, 16, 3.5, shade(RAMPS.mutantGreen, { bias: 0.1 }));
    fillEllipse(layer, cx - 9, groundY - 0.5, 4, 2, shade(RAMPS.mutantSpot));
    fillEllipse(layer, cx - 2, groundY - 1, 4.5, 2.2, shortsPaint);
    fillEllipse(layer, cx + 12, groundY, 3.5, 2, sneakerPaint);
  });
  drawEye(canvas, cx + 3, groundY - 5, 3.6, p.eyes, p.look, headPaint, true);
  drawEye(canvas, cx + 9, groundY - 4, 2.6, p.eyes, p.look, headPaint, false);
}

export function drawBulgo(canvas: PixelCanvas, p: BulgoPose): void {
  if (p.puddle) {
    drawPuddle(canvas, p);
    return;
  }
  const s = buildSkeleton(p);
  const body = new PixelCanvas(canvas.width, canvas.height);
  drawArm(body, s.backShoulder, p.backArm, false);
  drawLeg(body, { x: s.cx - 4, y: s.hipY }, s.backFoot, false);
  drawTorso(body, s);
  drawLeg(body, { x: s.cx + 3, y: s.hipY }, s.frontFoot, true);
  drawHead(body, s, p);
  drawArm(body, s.frontShoulder, p.frontArm, true);
  drawProps(body, p, s.head, armJoints(s.frontShoulder, p.frontArm).hand);
  const turns = p.spin ?? 0;
  canvas.draw(turns ? rotateQuarterTurns(body, turns, s.cx, s.cy) : body, 0, 0);
}

/** Exposed so gameplay can attach held weapons and projectiles to the hand. */
export function bulgoHandPosition(p: BulgoPose): { x: number; y: number } {
  const s = buildSkeleton(p);
  return armJoints(s.frontShoulder, p.frontArm).hand;
}
