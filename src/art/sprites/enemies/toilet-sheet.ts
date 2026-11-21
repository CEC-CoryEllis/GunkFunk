/**
 * Toilet Chomper: a porcelain toilet on stubby sneakered legs, angry eyes on
 * its tank, and a lid that opens to reveal rows of teeth. The closed lid is
 * armour — it only bares its gums right before it bites.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillEllipse, fillPolygon, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const TOILET_SHEET_KEY = "enemy-toilet";

const porcelain = shade(RAMPS.porcelain, { bias: 0.05 });
const sneaker = shade(RAMPS.sneaker, { bias: 0.1 });

interface ToiletPose {
  /** Vertical offset of the whole toilet (hops). */
  lift: number;
  /** Squash (<1) or stretch (>1). */
  squash: number;
  /** Lid opening, 0 closed .. 1 wide open. */
  open: number;
  /** Leg spread for hops. */
  legs: number;
  angry: boolean;
}

function drawTeeth(c: PixelCanvas, x0: number, x1: number, y: number, dir: 1 | -1): void {
  for (let x = x0; x <= x1; x += 3) {
    fillPolygon(
      c,
      [
        [x, y],
        [x + 2.5, y],
        [x + 1.2, y + dir * 3],
      ],
      WHITE,
    );
  }
}

function drawToilet(c: PixelCanvas, p: ToiletPose): void {
  const top = 4 - p.lift + (1 - p.squash) * 10;
  const h = (rowFromTop: number) => top + rowFromTop * p.squash;
  outlinedLayer(c, OUTLINE, (l) => {
    for (const lx of [12 - p.legs, 22 + p.legs]) {
      fillCapsule(l, lx, h(24), lx, 31 - p.lift * 0.4, 1.6, porcelain);
      fillEllipse(l, lx + 1.5, 31.5 - p.lift * 0.4, 3.2, 1.8, sneaker);
    }
  });
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 4, h(0), 9, 17 * p.squash, porcelain); // tank
    fillPolygon(
      l,
      [
        [13, h(24)],
        [24, h(24)],
        [22, h(17)],
        [14, h(17)],
      ],
      porcelain,
    ); // pedestal
    fillEllipse(l, 19, h(14), 10, 4.5 * p.squash, porcelain); // bowl
  });
  // Flush handle and tank eyes glaring forward.
  fillRect(c, 11, h(3), 4, 1, RAMPS.metal[3]!);
  for (const [ex, er] of [
    [7, 1.6],
    [10.5, 1.3],
  ] as const) {
    fillEllipse(c, ex, h(8), er + 0.8, er + 1, OUTLINE);
    fillEllipse(c, ex, h(8), er, er + 0.2, WHITE);
    c.plot(Math.round(ex + 0.6), Math.round(h(8.5)), OUTLINE);
  }
  if (p.angry) line(c, 5, h(5), 12, h(6.5), OUTLINE);
  // Mouth: dark water and teeth when open, a seat lid when shut.
  const hingeX = 10;
  const rimY = h(11);
  if (p.open > 0.05) {
    fillEllipse(c, 20, rimY + 1, 8, 2.5, RAMPS.murk[1]!);
    drawTeeth(c, 13, 26, rimY - 0.5, 1);
    const angle = p.open * 1.3;
    const lx = hingeX + Math.cos(angle) * 19;
    const ly = rimY - Math.sin(angle) * 19;
    fillCapsule(c, hingeX, rimY, lx, ly, 2, OUTLINE);
    fillCapsule(c, hingeX, rimY, lx, ly, 1.1, RAMPS.porcelain[2]!);
    for (let t = 0.3; t < 1; t += 0.22) {
      const tx = hingeX + Math.cos(angle) * 19 * t;
      const ty = rimY - Math.sin(angle) * 19 * t;
      c.plot(Math.round(tx + Math.sin(angle) * 2), Math.round(ty + Math.cos(angle) * 2), WHITE);
    }
  } else {
    outlinedLayer(c, OUTLINE, (l) => fillEllipse(l, 19, rimY - 1, 10, 1.8, porcelain));
  }
}

const base: ToiletPose = { lift: 0, squash: 1, open: 0, legs: 0, angry: true };
const vary = (o: Partial<ToiletPose>): ToiletPose => ({ ...base, ...o });

function frames(poses: ToiletPose[]): ((c: PixelCanvas) => void)[] {
  return poses.map((p) => (c: PixelCanvas) => drawToilet(c, p));
}

export function toiletSheetSpec(): SheetSpec {
  return {
    key: TOILET_SHEET_KEY,
    frameWidth: 34,
    frameHeight: 34,
    originX: 17,
    originY: 33,
    animations: [
      {
        name: "idle",
        frameRate: 4,
        repeat: -1,
        frames: frames([vary({}), vary({ squash: 0.96 })]),
      },
      {
        name: "hop",
        frameRate: 12,
        repeat: 0,
        frames: frames([
          vary({ squash: 0.85 }),
          vary({ squash: 1.1, lift: 2, legs: 1, open: 0.15 }),
          vary({ squash: 1.05, lift: 2, legs: 2 }),
        ]),
      },
      {
        name: "chomp",
        frameRate: 14,
        repeat: 0,
        holds: [0, 0, 120, 0, 60],
        frames: frames([
          vary({ open: 0.35 }),
          vary({ open: 0.75, squash: 1.04 }),
          vary({ open: 1, squash: 1.06 }),
          vary({ open: 0, squash: 0.88 }),
          vary({ open: 0, squash: 0.96 }),
        ]),
      },
      {
        name: "hurt",
        frameRate: 1,
        repeat: 0,
        frames: frames([vary({ open: 0.5, squash: 0.9, angry: false })]),
      },
    ],
  };
}
