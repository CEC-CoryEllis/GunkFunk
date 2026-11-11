/**
 * Bulgo's face: mismatched eyes, a heavy brow and an underbite with two
 * snaggle fangs. Expressions are driven by the pose's eyes/brow/mouth fields.
 */
import { INK, OUTLINE, RAMPS, WHITE } from "../../palettes";
import { type Color, TRANSPARENT } from "../../pixel/color";
import { type Paint, shade } from "../../pixel/paint";
import type { PixelCanvas } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEllipse, fillRect, line } from "../../pixel/shapes";
import type { BrowStyle, BulgoPose, EyeStyle, MouthStyle } from "./bulgo-pose";

export interface HeadShape {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const eyeWhitePaint = shade(RAMPS.eyeWhite, { bias: 0.25 });
const irisPaint = shade(RAMPS.iris, { bias: 0.1 });
const tonguePaint = shade(RAMPS.tongue, { bias: 0.1 });
const mouthInside = RAMPS.flesh[0]!;
const browColor = RAMPS.mutantGreen[0]!;

/** Paint that only covers pixels at or below a given row. */
function below(row: number, color: Color): Paint {
  return (_x, y) => (y >= row ? color : TRANSPARENT);
}

export function drawFace(canvas: PixelCanvas, head: HeadShape, pose: BulgoPose, skin: Paint): void {
  const { cx: hx, cy: hy } = head;
  const mouthY = hy + 1.5;
  const popped = pose.eyes === "pop";
  const lift = popped ? -5 : 0;
  if (popped) {
    fillCapsule(canvas, hx - 1, hy - 3, hx - 0.5, hy - 3 + lift, 1.2, skin);
    fillCapsule(canvas, hx + 5.5, hy - 2, hx + 6.5, hy - 2.5 + lift, 1, skin);
  }
  const big = pose.eyes === "wide" || popped ? 1.25 : 1;
  drawEye(canvas, hx + 5.5, hy - 2.5 + lift, 2.8 * big, pose.eyes, pose.look, skin, false);
  drawEye(canvas, hx - 1, hy - 3 + lift, 4 * big, pose.eyes, pose.look, skin, true);
  if (!popped) {
    drawBrow(canvas, hx, hy, pose.brow);
  }
  drawMouth(canvas, hx, mouthY, pose.mouth, skin);
}

export function drawEye(
  canvas: PixelCanvas,
  ex: number,
  ey: number,
  r: number,
  style: EyeStyle,
  look: readonly [number, number],
  skin: Paint,
  isNear: boolean,
): void {
  fillCircle(canvas, ex, ey, r + 1, OUTLINE);
  if (style === "blink" || style === "happy") {
    fillCircle(canvas, ex, ey, r, skin);
    if (style === "blink") {
      line(canvas, ex - r + 0.5, ey + 0.5, ex + r - 0.5, ey + 0.5, OUTLINE);
    } else {
      line(canvas, ex - r + 1, ey + 1.5, ex, ey - 0.5, OUTLINE);
      line(canvas, ex, ey - 0.5, ex + r - 1, ey + 1.5, OUTLINE);
    }
    return;
  }
  fillCircle(canvas, ex, ey, r, eyeWhitePaint);
  if (style === "dizzy") {
    const d = Math.max(1, Math.round(r * 0.6));
    line(canvas, ex - d, ey - d, ex + d, ey + d, INK);
    line(canvas, ex - d, ey + d, ex + d, ey - d, INK);
    return;
  }
  const px = ex + look[0] * r * 0.4 + 0.3;
  const py = ey + look[1] * r * 0.4;
  const tiny = style === "wide" || style === "pop";
  if (isNear && !tiny) {
    fillCircle(canvas, px, py, r * 0.5, irisPaint);
  }
  fillRect(canvas, Math.round(px - 0.5), Math.round(py - 0.5), tiny ? 1 : 2, tiny ? 1 : 2, INK);
  if (isNear) {
    canvas.plot(Math.round(px - 1.5), Math.round(py - 1.5), WHITE);
  }
  if (style === "squint") {
    // Heavy upper lid down to the middle of the eye.
    fillEllipse(canvas, ex, ey - r * 0.6, r + 0.5, r * 0.65, skin);
    line(canvas, ex - r, ey - 0.5, ex + r, ey - 0.5, OUTLINE);
  }
}

function drawBrow(canvas: PixelCanvas, hx: number, hy: number, style: BrowStyle): void {
  const [y0, y1] = (
    {
      flat: [-8, -7],
      angry: [-9.5, -5],
      worried: [-6.5, -9],
      raised: [-10, -9.5],
    } as const
  )[style];
  fillCapsule(canvas, hx - 5, hy + y0, hx + 8, hy + y1, 1.1, browColor);
}

/** Two lower fangs poking up over the lip — Bulgo's signature underbite. */
function drawFangs(canvas: PixelCanvas, hx: number, lipY: number): void {
  for (const fx of [hx + 1, hx + 6]) {
    fillRect(canvas, fx, lipY - 3, 2, 3, RAMPS.teeth[1]!);
    canvas.plot(fx, lipY - 3, RAMPS.teeth[2]!);
    canvas.plot(fx, lipY - 2, RAMPS.teeth[2]!);
  }
}

function drawMouth(
  canvas: PixelCanvas,
  hx: number,
  hy: number,
  style: MouthStyle,
  skin: Paint,
): void {
  switch (style) {
    case "smirk":
    case "chew": {
      const wobble = style === "chew" ? 1 : 0;
      line(canvas, hx - 5, hy + 2, hx - 2, hy + 4, OUTLINE);
      line(canvas, hx - 2, hy + 4, hx + 3, hy + 4 + wobble, OUTLINE);
      line(canvas, hx + 3, hy + 4 + wobble, hx + 10, hy + 3, OUTLINE);
      drawFangs(canvas, hx, hy + 4);
      return;
    }
    case "tongue": {
      line(canvas, hx - 5, hy + 2, hx - 2, hy + 4, OUTLINE);
      line(canvas, hx - 2, hy + 4, hx + 10, hy + 3, OUTLINE);
      fillCapsule(canvas, hx + 6, hy + 4.5, hx + 7.5, hy + 8, 2.4, OUTLINE);
      fillCapsule(canvas, hx + 6, hy + 4.5, hx + 7.5, hy + 8, 1.5, tonguePaint);
      drawFangs(canvas, hx, hy + 4);
      return;
    }
    case "frown": {
      line(canvas, hx - 3, hy + 6, hx - 1, hy + 4, OUTLINE);
      line(canvas, hx - 1, hy + 4, hx + 6, hy + 4, OUTLINE);
      line(canvas, hx + 6, hy + 4, hx + 8, hy + 6, OUTLINE);
      drawFangs(canvas, hx, hy + 4);
      return;
    }
    case "grin": {
      fillEllipse(canvas, hx + 3, hy + 2, 6.5, 4.5, below(hy + 1, OUTLINE));
      fillEllipse(canvas, hx + 3, hy + 2, 5.5, 3.5, below(hy + 2, mouthInside));
      for (let x = hx - 2; x <= hx + 8; x++) {
        if (((x - hx + 9) | 0) % 3 !== 2 && canvas.get(x, hy + 2) === mouthInside) {
          canvas.plot(x, hy + 2, RAMPS.teeth[2]!);
        }
      }
      fillEllipse(canvas, hx + 3, hy + 5, 2.5, 1.2, tonguePaint);
      return;
    }
    case "shout": {
      fillEllipse(canvas, hx + 4, hy + 4.5, 4.6, 4.6, OUTLINE);
      fillEllipse(canvas, hx + 4, hy + 4.5, 3.6, 3.6, mouthInside);
      fillRect(canvas, hx + 1, hy + 1, 6, 1, RAMPS.teeth[2]!);
      fillEllipse(canvas, hx + 4, hy + 7, 2.5, 1.2, tonguePaint);
      return;
    }
    case "o": {
      fillEllipse(canvas, hx + 5, hy + 4, 2.3, 2.8, OUTLINE);
      fillEllipse(canvas, hx + 5, hy + 4, 1.3, 1.8, mouthInside);
      return;
    }
    case "puff": {
      fillEllipse(canvas, hx + 5, hy + 3, 5, 4, OUTLINE);
      fillEllipse(canvas, hx + 5, hy + 3, 4, 3, skin);
      fillEllipse(canvas, hx + 9.5, hy + 3.5, 1.2, 1.5, OUTLINE);
      return;
    }
  }
}
