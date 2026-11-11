/**
 * Hand-authored pixel art as ASCII grids.
 *
 * Example:
 *   drawPixelMap(canvas, 4, 2, [
 *     ".kk.",
 *     "kwwk",
 *     ".kk.",
 *   ], { k: outline, w: white });
 *
 * "." and " " are transparent. Every other character must be in the legend,
 * so a typo fails loudly instead of silently drawing nothing.
 */
import type { Color } from "./color";
import type { PixelCanvas } from "./pixel-canvas";

export type PixelLegend = Readonly<Record<string, Color>>;

export function drawPixelMap(
  canvas: PixelCanvas,
  x: number,
  y: number,
  rows: readonly string[],
  legend: PixelLegend,
  flipX = false,
): void {
  const width = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      if (ch === "." || ch === " ") {
        return;
      }
      const color = legend[ch];
      if (color === undefined) {
        throw new Error(`Pixel map uses "${ch}" which is not in the legend`);
      }
      const px = flipX ? x + width - 1 - rx : x + rx;
      canvas.plot(Math.round(px), Math.round(y + ry), color);
    });
  });
}

export function pixelMapSize(rows: readonly string[]): { width: number; height: number } {
  return { width: Math.max(...rows.map((r) => r.length)), height: rows.length };
}
