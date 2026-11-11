/**
 * A fixed-size grid of packed colours with compositing and outline passes.
 * Shape rasterisation lives in `shapes.ts`; this class only owns pixel storage.
 */
import { type Color, TRANSPARENT, isOpaque } from "./color";

export class PixelCanvas {
  readonly width: number;
  readonly height: number;
  /** RGBA bytes; `pixels` is a packed-colour view over the same memory. */
  readonly bytes: Uint8ClampedArray<ArrayBuffer>;
  readonly pixels: Uint32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.bytes = new Uint8ClampedArray(width * height * 4);
    this.pixels = new Uint32Array(this.bytes.buffer);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Coordinates are rounded, so callers may pass fractional rig positions. */
  get(x: number, y: number): Color {
    const px = Math.round(x);
    const py = Math.round(y);
    return this.inBounds(px, py) ? this.pixels[py * this.width + px]! : TRANSPARENT;
  }

  set(x: number, y: number, color: Color): void {
    const px = Math.round(x);
    const py = Math.round(y);
    if (this.inBounds(px, py)) {
      this.pixels[py * this.width + px] = color;
    }
  }

  /** Writes only if the colour is opaque, so paints can return TRANSPARENT to skip pixels. */
  plot(x: number, y: number, color: Color): void {
    if (isOpaque(color)) {
      this.set(x, y, color);
    }
  }

  clear(): void {
    this.pixels.fill(TRANSPARENT);
  }

  fill(color: Color): void {
    this.pixels.fill(color);
  }

  isFilled(x: number, y: number): boolean {
    return isOpaque(this.get(x, y));
  }

  /** Copies opaque pixels of `source` onto this canvas at (dx, dy), optionally mirrored. */
  draw(source: PixelCanvas, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const color = source.pixels[y * source.width + x]!;
        if (isOpaque(color)) {
          const tx = flipX ? dx + source.width - 1 - x : dx + x;
          this.set(tx, dy + y, color);
        }
      }
    }
  }

  /**
   * Adds a 1-px outline around every opaque region (4-neighbourhood).
   * Run per body part before compositing to get the separated-limb look of
   * hand-drawn sprites, or once at the end for a pure silhouette outline.
   */
  outline(color: Color): void {
    const { width, height, pixels } = this;
    const edge: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isOpaque(pixels[y * width + x]!)) {
          continue;
        }
        if (
          this.isFilled(x - 1, y) ||
          this.isFilled(x + 1, y) ||
          this.isFilled(x, y - 1) ||
          this.isFilled(x, y + 1)
        ) {
          edge.push(y * width + x);
        }
      }
    }
    for (const index of edge) {
      pixels[index] = color;
    }
  }

  /** Replaces every opaque pixel with one colour (silhouettes, hit flashes, shadows). */
  silhouette(color: Color): void {
    for (let i = 0; i < this.pixels.length; i++) {
      if (isOpaque(this.pixels[i]!)) {
        this.pixels[i] = color;
      }
    }
  }

  clone(): PixelCanvas {
    const copy = new PixelCanvas(this.width, this.height);
    copy.pixels.set(this.pixels);
    return copy;
  }
}

/**
 * Draws one body part on its own layer, outlines it, and composites it onto
 * `target`. Drawing parts back-to-front this way gives every limb its own
 * readable outline, like hand-drawn sprites.
 */
export function outlinedLayer(
  target: PixelCanvas,
  outlineColor: Color,
  draw: (layer: PixelCanvas) => void,
): void {
  const layer = new PixelCanvas(target.width, target.height);
  draw(layer);
  layer.outline(outlineColor);
  target.draw(layer, 0, 0);
}
