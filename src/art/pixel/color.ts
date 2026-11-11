/**
 * Colour representation for the raster library.
 *
 * Colours are packed into a single 32-bit integer laid out so that a
 * `Uint32Array` view over RGBA bytes (little-endian, which every browser and
 * Node platform we target is) can be written directly: 0xAABBGGRR.
 * `TRANSPARENT` (0) is the only colour with zero alpha.
 */

export type Color = number;

/** An ordered list of colours from darkest to lightest, used for shading. */
export type Ramp = readonly Color[];

export const TRANSPARENT: Color = 0;

export function rgba(r: number, g: number, b: number, a = 255): Color {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Parses "#rgb" or "#rrggbb". Throws on malformed input so palette typos fail loudly at boot. */
export function hex(value: string): Color {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (!match) {
    throw new Error(`Invalid colour "${value}"`);
  }
  let digits = match[1]!;
  if (digits.length === 3) {
    digits = [...digits].map((d) => d + d).join("");
  }
  const n = Number.parseInt(digits, 16);
  return rgba((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff);
}

export function ramp(...values: string[]): Ramp {
  return values.map(hex);
}

export function red(c: Color): number {
  return c & 0xff;
}
export function green(c: Color): number {
  return (c >>> 8) & 0xff;
}
export function blue(c: Color): number {
  return (c >>> 16) & 0xff;
}
export function alpha(c: Color): number {
  return (c >>> 24) & 0xff;
}

export function isOpaque(c: Color): boolean {
  return alpha(c) !== 0;
}

/** Linear blend between two colours; only used for generating ramps, never per-pixel AA. */
export function mix(a: Color, b: Color, t: number): Color {
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  return rgba(
    lerp(red(a), red(b)),
    lerp(green(a), green(b)),
    lerp(blue(a), blue(b)),
    lerp(alpha(a), alpha(b)),
  );
}

function hexByte(n: number): string {
  return n.toString(16).padStart(2, "0");
}

export function toHex(c: Color): string {
  return `#${hexByte(red(c))}${hexByte(green(c))}${hexByte(blue(c))}`;
}

/** Phaser-style 0xRRGGBB number, for tints and camera flashes. */
export function toPhaserColor(c: Color): number {
  return (red(c) << 16) | (green(c) << 8) | blue(c);
}
