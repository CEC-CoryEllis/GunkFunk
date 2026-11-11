/**
 * Renders the 5×7 glyph set into RetroFont-compatible grid textures: each
 * glyph gets a vertical colour gradient, a dark outline and a drop shadow —
 * the classic chunky 16-bit HUD look.
 */
import { OUTLINE, RAMPS } from "../palettes";
import { type Ramp, hex, ramp } from "../pixel/color";
import { PixelCanvas } from "../pixel/pixel-canvas";
import { FONT_CHARS, GLYPHS } from "./glyphs-5x7";

export const FONT_CELL_WIDTH = 8;
export const FONT_CELL_HEIGHT = 10;
export const FONT_CHARS_PER_ROW = 16;

export type FontStyle = "white" | "gold" | "slime" | "pink";

export const FONT_STYLES: Readonly<Record<FontStyle, Ramp>> = {
  white: ramp("#c8c0e0", "#ffffff", "#ffffff"),
  gold: [RAMPS.gold[1]!, RAMPS.gold[2]!, RAMPS.gold[3]!, RAMPS.gold[4]!],
  slime: [RAMPS.sludge[2]!, RAMPS.sludge[3]!, RAMPS.sludge[4]!],
  pink: [RAMPS.hotPink[1]!, RAMPS.hotPink[2]!, RAMPS.hotPink[3]!],
};

const SHADOW = hex("#05020a");

export function fontTextureKey(style: FontStyle): string {
  return `font-${style}`;
}

export function buildFontCanvas(style: FontStyle): PixelCanvas {
  const colors = FONT_STYLES[style];
  const rows = Math.ceil(FONT_CHARS.length / FONT_CHARS_PER_ROW);
  const sheet = new PixelCanvas(FONT_CHARS_PER_ROW * FONT_CELL_WIDTH, rows * FONT_CELL_HEIGHT);
  [...FONT_CHARS].forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) return;
    const cell = new PixelCanvas(FONT_CELL_WIDTH, FONT_CELL_HEIGHT);
    glyph.forEach((row, y) => {
      [...row].forEach((px, x) => {
        if (px === "X") {
          // Gradient: darker at the top, brightest in the lower-middle, like 90s logo text.
          const tone = Math.min(colors.length - 1, Math.floor(((y + 1) / 7) * colors.length));
          cell.set(x + 1, y + 1, colors[tone]!);
        }
      });
    });
    cell.outline(OUTLINE);
    const shadowed = new PixelCanvas(FONT_CELL_WIDTH, FONT_CELL_HEIGHT);
    const shadow = cell.clone();
    shadow.silhouette(SHADOW);
    shadowed.draw(shadow, 1, 1);
    shadowed.draw(cell, 0, 0);
    sheet.draw(
      shadowed,
      (i % FONT_CHARS_PER_ROW) * FONT_CELL_WIDTH,
      Math.floor(i / FONT_CHARS_PER_ROW) * FONT_CELL_HEIGHT,
    );
  });
  return sheet;
}
