/**
 * Sludge Blob: a jiggling dome of toxic goo with a couple of eyeballs and
 * some bubbles floating around inside. Big blobs split in two when hit.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { bayer } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEgg } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const BLOB_SHEET_KEY = "enemy-blob";
const W = 28;
const H = 24;
const CX = 14;
const GROUND = 23;

interface BlobPose {
  size: number;
  /** Horizontal / vertical jiggle multipliers. */
  sx: number;
  sy: number;
  /** Pixels off the ground (hops). */
  lift: number;
  /** Where the floating eyeballs are looking/bobbing. */
  drift: number;
  hurt?: boolean;
}

/** Goo shading: brighter towards the upper-left, dithered "inner glow" for translucency. */
function gooPaint(x: number, y: number, nx: number, ny: number): number {
  const S = RAMPS.sludge;
  const light = -nx * 0.5 - ny * 0.8;
  if (light > 0.55) return S[4]!;
  if (light > 0.15) return S[3]!;
  if (light > -0.35) return bayer(x, y) > 0.55 ? S[3]! : S[2]!;
  return S[1]!;
}

function drawBlob(c: PixelCanvas, p: BlobPose): void {
  const rx = 10 * p.size * p.sx;
  const ry = 8 * p.size * p.sy;
  const cy = GROUND - p.lift - ry;
  outlinedLayer(c, OUTLINE, (l) => {
    fillEgg(l, CX, cy, rx * 0.8, rx, ry, gooPaint);
    if (p.lift === 0)
      fillCapsule(l, CX + rx * 0.5, GROUND - 2, CX + rx * 0.55, GROUND, 1, gooPaint); // drool
  });
  // Floating eyeballs (one big, one small) and bubbles.
  const eyes: [number, number, number][] = [
    [-0.3, -0.2, 2.6],
    [0.3, 0.1, 1.8],
  ];
  for (const [ex, ey, er] of eyes) {
    const x = CX + ex * rx + p.drift;
    const y = cy + ey * ry - p.drift * 0.5;
    const r = er * Math.max(0.6, p.size);
    fillCircle(c, x, y, r + 0.7, RAMPS.sludge[0]!);
    fillCircle(c, x, y, r, WHITE);
    if (p.hurt) {
      c.plot(Math.round(x - 1), Math.round(y - 1), OUTLINE);
      c.plot(Math.round(x + 1), Math.round(y + 1), OUTLINE);
    } else {
      c.plot(Math.round(x + 0.8), Math.round(y), OUTLINE);
      if (r > 2) c.plot(Math.round(x + 0.8), Math.round(y + 1), OUTLINE);
    }
  }
  for (const [bx, by] of [
    [0.45, -0.45],
    [-0.5, 0.35],
  ] as const) {
    c.plot(Math.round(CX + bx * rx), Math.round(cy + by * ry + p.drift), RAMPS.sludge[4]!);
  }
}

function blobAnimations(name: string, size: number) {
  const frames = (poses: Omit<BlobPose, "size">[]) =>
    poses.map((p) => (c: PixelCanvas) => drawBlob(c, { ...p, size }));
  return [
    {
      name: `${name}_idle`,
      frameRate: 6,
      repeat: -1,
      frames: frames([
        { sx: 1, sy: 1, lift: 0, drift: 0 },
        { sx: 1.06, sy: 0.94, lift: 0, drift: 1 },
        { sx: 1, sy: 1, lift: 0, drift: 0 },
        { sx: 0.95, sy: 1.05, lift: 0, drift: -1 },
      ]),
    },
    {
      name: `${name}_hop`,
      frameRate: 10,
      repeat: 0,
      frames: frames([
        { sx: 1.2, sy: 0.75, lift: 0, drift: 1 },
        { sx: 0.82, sy: 1.22, lift: 3, drift: -1 },
        { sx: 0.9, sy: 1.1, lift: 4, drift: 0 },
      ]),
    },
    {
      name: `${name}_hurt`,
      frameRate: 1,
      repeat: 0,
      frames: frames([{ sx: 1.25, sy: 0.7, lift: 0, drift: 0, hurt: true }]),
    },
  ];
}

export function blobSheetSpec(): SheetSpec {
  return {
    key: BLOB_SHEET_KEY,
    frameWidth: W,
    frameHeight: H,
    originX: CX,
    originY: GROUND,
    animations: [...blobAnimations("big", 1), ...blobAnimations("small", 0.6)],
  };
}
