/**
 * Pixel-exact shape rasterisers. Every shape samples pixel centres, never
 * blends, and hands the paint a surface normal so shading can be applied.
 */
import { type Color, isOpaque } from "./color";
import type { Paint } from "./paint";
import type { PixelCanvas } from "./pixel-canvas";

export type Point = readonly [number, number];

function asPaint(paint: Paint | Color): Paint {
  return typeof paint === "number" ? () => paint : paint;
}

export function fillRect(
  canvas: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: Paint | Color,
): void {
  const p = asPaint(paint);
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  for (let py = y0; py < y0 + Math.round(h); py++) {
    for (let px = x0; px < x0 + Math.round(w); px++) {
      // Rectangles shade like a horizontal cylinder: lit from the top edge.
      const ny = ((py - y0 + 0.5) / Math.max(1, h)) * 2 - 1;
      canvas.plot(px, py, p(px, py, 0, ny * 0.8));
    }
  }
}

/** Filled ellipse centred on (cx, cy), optionally rotated by `angle` radians. */
export function fillEllipse(
  canvas: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  paint: Paint | Color,
  angle = 0,
): void {
  const p = asPaint(paint);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const reach = Math.ceil(Math.max(rx, ry)) + 1;
  for (let py = Math.floor(cy - reach); py <= Math.ceil(cy + reach); py++) {
    for (let px = Math.floor(cx - reach); px <= Math.ceil(cx + reach); px++) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      // Rotate into ellipse space.
      const u = (dx * cos + dy * sin) / Math.max(rx, 0.5);
      const v = (-dx * sin + dy * cos) / Math.max(ry, 0.5);
      if (u * u + v * v <= 1.0001) {
        // Normal back in screen space so lighting stays world-aligned.
        canvas.plot(px, py, p(px, py, u * cos - v * sin, u * sin + v * cos));
      }
    }
  }
}

export function fillCircle(
  canvas: PixelCanvas,
  cx: number,
  cy: number,
  r: number,
  paint: Paint | Color,
): void {
  fillEllipse(canvas, cx, cy, r, r, paint);
}

/**
 * An egg / pear: an ellipse whose horizontal radius changes from `rxTop` at the
 * top to `rxBottom` at the bottom. Torsos, sacks, blobs and pimples.
 */
export function fillEgg(
  canvas: PixelCanvas,
  cx: number,
  cy: number,
  rxTop: number,
  rxBottom: number,
  ry: number,
  paint: Paint | Color,
): void {
  const p = asPaint(paint);
  const reachX = Math.ceil(Math.max(rxTop, rxBottom)) + 1;
  const reachY = Math.ceil(ry) + 1;
  for (let py = Math.floor(cy - reachY); py <= Math.ceil(cy + reachY); py++) {
    const v = (py + 0.5 - cy) / Math.max(ry, 0.5);
    const rx = rxTop + (rxBottom - rxTop) * ((v + 1) / 2);
    for (let px = Math.floor(cx - reachX); px <= Math.ceil(cx + reachX); px++) {
      const u = (px + 0.5 - cx) / Math.max(rx, 0.5);
      if (u * u + v * v <= 1.0001) {
        canvas.plot(px, py, p(px, py, u, v));
      }
    }
  }
}

/** A thick rounded segment (limbs, pipes, tentacles), shaded like a cylinder. */
export function fillCapsule(
  canvas: PixelCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  paint: Paint | Color,
): void {
  const p = asPaint(paint);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSq = dx * dx + dy * dy || 1;
  const reach = Math.ceil(radius) + 1;
  const minX = Math.floor(Math.min(x0, x1) - reach);
  const maxX = Math.ceil(Math.max(x0, x1) + reach);
  const minY = Math.floor(Math.min(y0, y1) - reach);
  const maxY = Math.ceil(Math.max(y0, y1) + reach);
  const r = Math.max(radius, 0.5);
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      const t = Math.min(Math.max(((cx - x0) * dx + (cy - y0) * dy) / lengthSq, 0), 1);
      const ox = cx - (x0 + dx * t);
      const oy = cy - (y0 + dy * t);
      if (ox * ox + oy * oy <= r * r + 0.0001) {
        canvas.plot(px, py, p(px, py, ox / r, oy / r));
      }
    }
  }
}

/** Even-odd scanline polygon fill. Normal is derived from distance to the centroid. */
export function fillPolygon(
  canvas: PixelCanvas,
  points: readonly Point[],
  paint: Paint | Color,
): void {
  if (points.length < 3) {
    return;
  }
  const p = asPaint(paint);
  const ys = points.map((pt) => pt[1]);
  const xs = points.map((pt) => pt[0]);
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  const halfW = Math.max(1, (Math.max(...xs) - Math.min(...xs)) / 2);
  const halfH = Math.max(1, (maxY - minY) / 2);
  for (let py = minY; py <= maxY; py++) {
    const sy = py + 0.5;
    const crossings: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i]!;
      const [bx, by] = points[(i + 1) % points.length]!;
      if (ay <= sy !== by <= sy) {
        crossings.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      for (
        let px = Math.ceil(crossings[i]! - 0.5);
        px <= Math.floor(crossings[i + 1]! - 0.5);
        px++
      ) {
        const nx = Math.max(-1, Math.min(1, (px + 0.5 - cx) / halfW));
        const ny = Math.max(-1, Math.min(1, (sy - cy) / halfH));
        canvas.plot(px, py, p(px, py, nx * 0.9, ny * 0.9));
      }
    }
  }
}

/** Bresenham line, 1 px wide. */
export function line(
  canvas: PixelCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Color,
): void {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    canvas.plot(x, y, color);
    if (x === tx && y === ty) {
      return;
    }
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Plots a list of individual pixels relative to an origin (highlights, freckles, sparkles). */
export function dots(
  canvas: PixelCanvas,
  ox: number,
  oy: number,
  points: readonly Point[],
  color: Color,
): void {
  for (const [x, y] of points) {
    canvas.plot(Math.round(ox + x), Math.round(oy + y), color);
  }
}

/** Erases pixels inside an ellipse (mouths, holes, bites taken out of things). */
export function eraseEllipse(
  canvas: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  const reach = Math.ceil(Math.max(rx, ry)) + 1;
  for (let py = Math.floor(cy - reach); py <= Math.ceil(cy + reach); py++) {
    for (let px = Math.floor(cx - reach); px <= Math.ceil(cx + reach); px++) {
      const u = (px + 0.5 - cx) / Math.max(rx, 0.5);
      const v = (py + 0.5 - cy) / Math.max(ry, 0.5);
      if (u * u + v * v <= 1 && isOpaque(canvas.get(px, py))) {
        canvas.set(px, py, 0);
      }
    }
  }
}
