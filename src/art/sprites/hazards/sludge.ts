/**
 * Animated toxic sludge: a bubbling surface strip and a murky body tile.
 * Drawn as 16×16 frames so a hazard run is just a row of looping sprites.
 */
import { OUTLINE, RAMPS } from "../../palettes";
import { bayer } from "../../pixel/paint";
import type { PixelCanvas } from "../../pixel/pixel-canvas";
import { fillCircle } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

const S = RAMPS.sludge;
const FRAMES = 6;

function surfaceFrame(c: PixelCanvas, frame: number): void {
  const phase = (frame / FRAMES) * Math.PI * 2;
  for (let x = 0; x < 16; x++) {
    const wave = Math.round(1.5 + Math.sin((x / 16) * Math.PI * 2 + phase) * 1.2);
    for (let y = wave; y < 16; y++) {
      const depth = y - wave;
      let tone = depth === 0 ? 4 : depth < 2 ? 3 : depth < 6 ? 2 : 1;
      if (depth >= 2 && depth < 6 && bayer(x, y) > 0.7) tone = 1;
      c.set(x, y, S[tone]!);
    }
    c.set(x, wave - 1, OUTLINE);
  }
  // Bubbles rise and pop across the loop.
  const bubbleX = [4, 11];
  bubbleX.forEach((bx, i) => {
    const t = (frame + i * 3) % FRAMES;
    if (t < 4) {
      const by = 10 - t * 2;
      fillCircle(c, bx, by, 1 + (t > 1 ? 0.6 : 0), S[3]!);
      c.set(bx - 1, by - 1, S[4]!);
    }
  });
}

function bodyFrame(c: PixelCanvas, frame: number): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const swirl = Math.sin((x + frame * 2) * 0.5 + y * 0.7) > 0.6;
      c.set(x, y, swirl && bayer(x, y) > 0.5 ? S[2]! : S[1]!);
    }
  }
}

export function sludgeSheetSpec(): SheetSpec {
  const frames = Array.from({ length: FRAMES }, (_, i) => i);
  return {
    key: "sludge",
    frameWidth: 16,
    frameHeight: 16,
    originX: 0,
    originY: 0,
    animations: [
      {
        name: "surface",
        frameRate: 8,
        repeat: -1,
        frames: frames.map((f) => (c) => surfaceFrame(c, f)),
      },
      { name: "body", frameRate: 6, repeat: -1, frames: frames.map((f) => (c) => bodyFrame(c, f)) },
    ],
  };
}
