/**
 * Renders every generated sprite sheet to PNG for review:
 *   art-export/<key>.png       — 1× with transparency (what the game uses)
 *   art-export/<key>@4x.png    — 4× on a dark backdrop with frame grid, for humans
 *
 * Usage: npm run art:export [-- <sheetKey> ...]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hex, isOpaque } from "../src/art/pixel/color";
import { PixelCanvas } from "../src/art/pixel/pixel-canvas";
import { type BuiltSheet, buildSheet } from "../src/art/pixel/sprite-sheet";
import { spriteCatalog } from "../src/art/sprite-catalog";
import { encodePng } from "./png-encoder";

const OUT_DIR = join(import.meta.dirname, "..", "art-export");
const SCALE = 4;
const BACKDROP = hex("#3a3550");
const GRID = hex("#5c5678");

function reviewImage(sheet: BuiltSheet): PixelCanvas {
  const src = sheet.canvas;
  const out = new PixelCanvas(src.width * SCALE, src.height * SCALE);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const sx = Math.floor(x / SCALE);
      const sy = Math.floor(y / SCALE);
      const color = src.get(sx, sy);
      const onGrid = x % (sheet.frameWidth * SCALE) === 0 || y % (sheet.frameHeight * SCALE) === 0;
      out.set(x, y, isOpaque(color) ? color : onGrid ? GRID : BACKDROP);
    }
  }
  return out;
}

const only = new Set(process.argv.slice(2));
mkdirSync(OUT_DIR, { recursive: true });
for (const spec of spriteCatalog()) {
  if (only.size > 0 && !only.has(spec.key)) {
    continue;
  }
  const sheet = buildSheet(spec);
  writeFileSync(
    join(OUT_DIR, `${sheet.key}.png`),
    encodePng(sheet.canvas.width, sheet.canvas.height, sheet.canvas.bytes),
  );
  const review = reviewImage(sheet);
  writeFileSync(
    join(OUT_DIR, `${sheet.key}@4x.png`),
    encodePng(review.width, review.height, review.bytes),
  );
  const anims = sheet.animations.map((a) => `${a.name}(${a.frames.length})`).join(" ");
  console.log(
    `${sheet.key}: ${sheet.frameCount} frames ${sheet.frameWidth}x${sheet.frameHeight} — ${anims}`,
  );
}
