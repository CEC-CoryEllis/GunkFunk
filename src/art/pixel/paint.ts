/**
 * Paints decide the colour of each pixel a shape covers.
 *
 * Shapes call a paint with the pixel position and the surface normal of the
 * shape at that pixel (nx, ny in -1..1; the z component is implied). This lets
 * the same ellipse be filled flat, sphere-shaded with dithered bands, or
 * patterned, which is where most of the "16-bit" look comes from.
 */
import type { Color, Ramp } from "./color";

export type Paint = (x: number, y: number, nx: number, ny: number) => Color;

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Ordered-dither threshold in (0, 1) for a pixel. */
export function bayer(x: number, y: number): number {
  return (BAYER_4X4[y & 3]![x & 3]! + 0.5) / 16;
}

export function solid(color: Color): Paint {
  return () => color;
}

export interface ShadeOptions {
  /** Light direction (pointing from the surface towards the light). Default: upper-left-front. */
  light?: readonly [number, number, number];
  /** Adds to the lit amount; positive brightens the whole shape. */
  bias?: number;
  /**
   * 0 = hard bands (no dithering), 1 = classic narrow dither bands between steps.
   * Higher values widen the dithered transitions.
   */
  dither?: number;
}

const DEFAULT_LIGHT: readonly [number, number, number] = normalize3(-0.55, -0.75, 0.65);

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

/** Picks a ramp entry for a 0..1 lightness, dithering only inside narrow bands around each step. */
export function rampAt(
  colors: Ramp,
  lightness: number,
  x: number,
  y: number,
  dither: number,
): Color {
  const steps = colors.length - 1;
  const scaled = Math.min(Math.max(lightness, 0), 1) * steps;
  const base = Math.floor(scaled);
  if (base >= steps) {
    return colors[steps]!;
  }
  const frac = scaled - base;
  // Squeeze the fractional part so most of each band is a flat colour and only
  // the transition is dithered, like hand-placed 16-bit shading.
  const sharpness = dither <= 0 ? 1000 : 3 / dither;
  const t = Math.min(Math.max((frac - 0.5) * sharpness + 0.5, 0), 1);
  return colors[t > bayer(x, y) ? base + 1 : base]!;
}

/** Lambert shading of the shape's surface normal against a light, mapped onto a ramp. */
export function shade(colors: Ramp, options: ShadeOptions = {}): Paint {
  const [lx, ly, lz] = options.light ?? DEFAULT_LIGHT;
  const bias = options.bias ?? 0;
  const dither = options.dither ?? 1;
  return (x, y, nx, ny) => {
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const lambert = nx * lx + ny * ly + nz * lz;
    // Map [-1, 1] → [0, 1] with a slight lift so shadowed sides keep some form.
    const lightness = lambert * 0.55 + 0.5 + bias;
    return colors[0] === undefined ? 0 : rampAt(colors, lightness, x, y, dither);
  };
}

/** Vertical gradient across the whole canvas height range [top, bottom]. */
export function verticalGradient(colors: Ramp, top: number, bottom: number, dither = 1): Paint {
  const span = Math.max(1, bottom - top);
  return (x, y) => rampAt(colors, 1 - (y - top) / span, x, y, dither);
}

/** Two-colour checker dither, the classic 16-bit "50% tone". */
export function checker(a: Color, b: Color): Paint {
  return (x, y) => ((x + y) & 1 ? a : b);
}

/** Wraps a paint so that a predicate can override pixels (spots, stripes, patterns). */
export function overlay(
  base: Paint,
  predicate: (x: number, y: number) => boolean,
  over: Paint,
): Paint {
  return (x, y, nx, ny) => (predicate(x, y) ? over(x, y, nx, ny) : base(x, y, nx, ny));
}
