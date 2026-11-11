/**
 * World 1 tileset: grimy purple sewer bricks with toxic slime caps, metal
 * grates, ladders and rusty spikes. Bricks are autotiled from a 4-bit
 * neighbour mask so edges get slime tops, shadowed undersides and outlines.
 */
import { OUTLINE, RAMPS } from "../palettes";
import { type Color } from "../pixel/color";
import { bayer, shade } from "../pixel/paint";
import { PixelCanvas } from "../pixel/pixel-canvas";
import { fillCircle, fillPolygon, fillRect, line } from "../pixel/shapes";
import { TILE, TILESET_COLUMNS, TILESET_SIZE } from "./tile-ids";

const T = 16;

/** Deterministic per-pixel noise so tiles are identical on every boot. */
function noise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function brickColor(lx: number, ly: number, seed: number): Color {
  const B = RAMPS.brick;
  const row = Math.floor(ly / 4);
  const offset = row % 2 === 0 ? 0 : 4;
  const bx = (lx + offset) % 8;
  const by = ly % 4;
  if (by === 3 || bx === 7) return B[0]!; // mortar
  const brickId = Math.floor((lx + offset) / 8) + row * 3;
  let level = 2 + (noise(brickId, row, seed) > 0.75 ? -1 : 0);
  if (by === 0) level += 1; // top highlight of each brick
  if (bx === 6 || by === 2) level -= 1; // bottom/right shade
  if (noise(lx, ly, seed + 7) > 0.93) level -= 1; // grime speckle
  return B[Math.max(0, Math.min(B.length - 1, level))]!;
}

function drawBrick(c: PixelCanvas, ox: number, oy: number, mask: number, seed: number): void {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      c.set(ox + x, oy + y, brickColor(x, y, seed));
    }
  }
  const openN = (mask & 1) === 0;
  const openE = (mask & 2) === 0;
  const openS = (mask & 4) === 0;
  const openW = (mask & 8) === 0;
  if (openS) {
    fillRect(c, ox, oy + T - 3, T, 2, RAMPS.brick[0]!);
    fillRect(c, ox, oy + T - 1, T, 1, OUTLINE);
  }
  if (openW) {
    fillRect(c, ox, oy, 1, T, OUTLINE);
    fillRect(c, ox + 1, oy, 1, T, RAMPS.brick[3]!);
  }
  if (openE) {
    fillRect(c, ox + T - 2, oy, 1, T, RAMPS.brick[0]!);
    fillRect(c, ox + T - 1, oy, 1, T, OUTLINE);
  }
  if (openN) {
    drawSlimeCap(c, ox, oy, seed);
  }
}

/** Toxic slime oozing over the top edge, with drips of varying length. */
function drawSlimeCap(c: PixelCanvas, ox: number, oy: number, seed: number): void {
  const S = RAMPS.sludge;
  fillRect(c, ox, oy, T, 1, OUTLINE);
  for (let x = 0; x < T; x++) {
    const depth = 3 + Math.floor(noise(x >> 1, 0, seed) * 2);
    const drip = noise(x, 1, seed + 3) > 0.82 ? 2 + Math.floor(noise(x, 2, seed) * 4) : 0;
    for (let y = 1; y < depth + drip; y++) {
      const isDrip = y >= depth;
      const tone = y === 1 ? 4 : y === 2 ? 3 : isDrip ? 2 : 2;
      c.set(ox + x, oy + y, S[tone]!);
    }
    c.set(ox + x, oy + depth + drip, S[0]!);
  }
}

function drawGrate(c: PixelCanvas, ox: number, oy: number): void {
  const M = RAMPS.metal;
  fillRect(c, ox, oy, T, 1, OUTLINE);
  fillRect(c, ox, oy + 1, T, 1, M[4]!);
  fillRect(c, ox, oy + 2, T, 1, M[3]!);
  fillRect(c, ox, oy + 3, T, 1, M[1]!);
  fillRect(c, ox, oy + 4, T, 1, OUTLINE);
  // Lattice under the walking surface.
  for (let x = 0; x < T; x += 4) {
    line(c, ox + x, oy + 5, ox + x + 3, oy + 8, M[2]!);
    line(c, ox + x + 3, oy + 5, ox + x, oy + 8, M[1]!);
  }
  fillRect(c, ox, oy + 9, T, 1, OUTLINE);
  for (const rx of [3, 12]) c.set(ox + rx, oy + 2, M[0]!);
}

function drawLadder(c: PixelCanvas, ox: number, oy: number, top: boolean): void {
  const P = RAMPS.rust;
  for (const rx of [2, 12]) {
    fillRect(c, ox + rx - 1, oy, 1, T, OUTLINE);
    fillRect(c, ox + rx, oy, 1, T, P[2]!);
    fillRect(c, ox + rx + 1, oy, 1, T, P[1]!);
    fillRect(c, ox + rx + 2, oy, 1, T, OUTLINE);
  }
  for (let y = top ? 3 : 1; y < T; y += 5) {
    fillRect(c, ox + 4, oy + y - 1, 8, 1, OUTLINE);
    fillRect(c, ox + 4, oy + y, 8, 1, P[2]!);
    fillRect(c, ox + 4, oy + y + 1, 8, 1, OUTLINE);
  }
  if (top) {
    for (const rx of [1, 11]) {
      fillRect(c, ox + rx, oy, 4, 2, OUTLINE);
      fillRect(c, ox + rx + 1, oy, 2, 1, P[2]!);
    }
  }
}

function drawSpikes(c: PixelCanvas, ox: number, oy: number): void {
  const paint = shade(RAMPS.metal, { bias: 0.05 });
  for (let i = 0; i < 4; i++) {
    const bx = ox + i * 4;
    const h = 6 + ((i * 5) % 4);
    fillPolygon(
      c,
      [
        [bx - 0.5, oy + T],
        [bx + 2, oy + T - h],
        [bx + 4.5, oy + T],
      ],
      OUTLINE,
    );
    fillPolygon(
      c,
      [
        [bx + 0.5, oy + T],
        [bx + 2, oy + T - h + 1.5],
        [bx + 3.5, oy + T],
      ],
      paint,
    );
    c.set(bx + 2, oy + T - h + 2, RAMPS.rust[2]!);
  }
  fillRect(c, ox, oy + T - 2, T, 2, RAMPS.rust[0]!);
}

/** Interior variants break up repetition: a cracked brick, a dripping outlet, a grime stain. */
function drawInteriorDetail(c: PixelCanvas, ox: number, oy: number, variant: number): void {
  if (variant === 1) {
    line(c, ox + 4, oy + 2, ox + 7, oy + 7, OUTLINE);
    line(c, ox + 7, oy + 7, ox + 5, oy + 12, OUTLINE);
  } else if (variant === 2) {
    fillCircle(c, ox + 8, oy + 8, 4, OUTLINE);
    fillCircle(c, ox + 8, oy + 8, 3, RAMPS.pipe[1]!);
    fillCircle(c, ox + 8, oy + 8, 2, RAMPS.murk[0]!);
    fillRect(c, ox + 8, oy + 10, 1, 4, RAMPS.sludge[3]!);
  } else if (variant === 3) {
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const d = Math.hypot(x - 6, y - 10) / 7;
        if (d < 1 && bayer(x, y) > d) c.set(ox + x, oy + y, RAMPS.slimeGrime[1]!);
      }
    }
  }
}

export function buildSewerTileset(): PixelCanvas {
  const rows = Math.ceil(TILESET_SIZE / TILESET_COLUMNS);
  const c = new PixelCanvas(TILESET_COLUMNS * T, rows * T);
  const at = (index: number) =>
    [(index % TILESET_COLUMNS) * T, Math.floor(index / TILESET_COLUMNS) * T] as const;
  for (let mask = 0; mask < 16; mask++) {
    const [x, y] = at(TILE.brickBase + mask);
    drawBrick(c, x, y, mask, 1);
  }
  for (let v = 1; v <= 3; v++) {
    const [x, y] = at(TILE.brickInterior + v - 1);
    drawBrick(c, x, y, 15, 1 + v);
    drawInteriorDetail(c, x, y, v);
  }
  drawGrate(c, ...at(TILE.grate));
  drawLadder(c, ...at(TILE.ladder), false);
  drawLadder(c, ...at(TILE.ladderTop), true);
  drawSpikes(c, ...at(TILE.spikes));
  return c;
}
