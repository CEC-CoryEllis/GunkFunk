/**
 * Small extras drawn with a pose: sweat, dizzy stars, motion lines and the
 * all-important booger.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import type { PixelCanvas } from "../../pixel/pixel-canvas";
import { dots, fillCircle, fillEllipse, line } from "../../pixel/shapes";
import type { HeadShape } from "./bulgo-face";
import type { BulgoPose } from "./bulgo-pose";

const boogerPaint = shade(RAMPS.sludge, { bias: 0.15 });

function sweatDrop(canvas: PixelCanvas, x: number, y: number): void {
  dots(canvas, x, y, [[0, 0]], OUTLINE);
  dots(
    canvas,
    x,
    y,
    [
      [-1, 1],
      [1, 1],
      [-1, 2],
      [1, 2],
      [0, 3],
    ],
    OUTLINE,
  );
  dots(
    canvas,
    x,
    y,
    [
      [0, 1],
      [0, 2],
    ],
    RAMPS.cyan[2]!,
  );
}

function star(canvas: PixelCanvas, x: number, y: number): void {
  dots(
    canvas,
    x,
    y,
    [
      [0, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    RAMPS.gold[3]!,
  );
  canvas.plot(Math.round(x), Math.round(y), WHITE);
}

export function drawProps(
  canvas: PixelCanvas,
  pose: BulgoPose,
  head: HeadShape,
  hand: { x: number; y: number },
): void {
  for (const prop of pose.props ?? []) {
    switch (prop) {
      case "sweat":
        sweatDrop(canvas, head.cx - 8, head.cy - 9);
        sweatDrop(canvas, head.cx + 11, head.cy - 6);
        break;
      case "stars":
        star(canvas, head.cx - 6, head.cy - 12);
        star(canvas, head.cx + 2, head.cy - 14);
        star(canvas, head.cx + 9, head.cy - 11);
        break;
      case "motionLines":
        for (const dy of [-6, 0, 6]) {
          line(canvas, head.cx - 30, head.cy + 8 + dy, head.cx - 22, head.cy + 8 + dy, WHITE);
        }
        break;
      case "booger":
        fillCircle(canvas, hand.x + 2, hand.y - 4, 2.2, OUTLINE);
        fillCircle(canvas, hand.x + 2, hand.y - 4, 1.4, boogerPaint);
        break;
      case "fingerInNose":
        // A single finger extended from the fist up into the nostril.
        line(canvas, hand.x + 1, hand.y - 3, head.cx + 8, head.cy + 1, OUTLINE);
        line(canvas, hand.x + 2, hand.y - 3, head.cx + 9, head.cy + 1, RAMPS.mutantGreen[2]!);
        break;
      case "heart":
        fillEllipse(canvas, head.cx + 12, head.cy - 12, 1.6, 1.6, RAMPS.hotPink[2]!);
        fillEllipse(canvas, head.cx + 15, head.cy - 12, 1.6, 1.6, RAMPS.hotPink[2]!);
        dots(
          canvas,
          head.cx + 12,
          head.cy - 11,
          [
            [0, 1],
            [1, 1],
            [2, 1],
            [3, 1],
            [1, 2],
            [2, 2],
          ],
          RAMPS.hotPink[2]!,
        );
        break;
    }
  }
}
