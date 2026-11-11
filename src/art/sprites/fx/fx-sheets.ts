/**
 * General-purpose effect sprites: dust puffs for jumps/landings/skids and the
 * cartoon impact burst for hits.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import type { PixelCanvas } from "../../pixel/pixel-canvas";
import { fillCircle, fillPolygon } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

const dustPaint = shade(RAMPS.sewerStone, { bias: 0.35 });

function dustFrame(c: PixelCanvas, t: number): void {
  const puffs: readonly [number, number, number][] = [
    [-5, 0, 3.2],
    [0, -2, 4],
    [5, 0, 3.2],
  ];
  for (const [dx, dy, r] of puffs) {
    const radius = r * (0.6 + t * 0.7) * (1 - t * 0.5);
    const x = 12 + dx * (1 + t * 1.2);
    const y = 12 + dy - t * 3;
    if (radius > 0.6) {
      fillCircle(c, x, y, radius + 1, OUTLINE);
    }
  }
  for (const [dx, dy, r] of puffs) {
    const radius = r * (0.6 + t * 0.7) * (1 - t * 0.5);
    if (radius > 0.6) fillCircle(c, 12 + dx * (1 + t * 1.2), 12 + dy - t * 3, radius, dustPaint);
  }
}

function burstFrame(c: PixelCanvas, t: number): void {
  const spikes = 8;
  const outer = 6 + t * 7;
  const inner = 3 + t * 3;
  const points: [number, number][] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 + t * 0.4;
    const r = i % 2 === 0 ? outer : inner;
    points.push([16 + Math.cos(angle) * r, 16 + Math.sin(angle) * r]);
  }
  fillPolygon(c, points, t < 0.5 ? RAMPS.gold[3]! : RAMPS.fire[2]!);
  c.outline(OUTLINE);
  fillCircle(c, 16, 16, inner * (1 - t * 0.6), WHITE);
}

/** `n` evenly spaced animation progress values from 0 to 1. */
function steps(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i / (n - 1));
}

export function fxSheetSpecs(): SheetSpec[] {
  return [
    {
      key: "fx-dust",
      frameWidth: 24,
      frameHeight: 16,
      originX: 12,
      originY: 15,
      animations: [
        {
          name: "puff",
          frameRate: 18,
          repeat: 0,
          frames: steps(6).map((t) => (c) => dustFrame(c, t)),
        },
      ],
    },
    {
      key: "fx-burst",
      frameWidth: 32,
      frameHeight: 32,
      originX: 16,
      originY: 16,
      animations: [
        {
          name: "pop",
          frameRate: 24,
          repeat: 0,
          frames: steps(5).map((t) => (c) => burstFrame(c, t)),
        },
      ],
    },
  ];
}
