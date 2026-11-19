/**
 * Turnip Grenadier: a grumpy mutant turnip with a leafy mohawk and a unibrow,
 * lobbing stink bombs from a safe distance. Panics when you get close.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import type { Color } from "../../pixel/color";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEllipse, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const TURNIP_SHEET_KEY = "enemy-turnip";

const leafPaint = shade(RAMPS.mutantGreen, { bias: 0.1 });
const bombPaint = shade(RAMPS.sludge, { bias: -0.1 });
const purpleTop = shade(RAMPS.turnip, { bias: -0.15 });
const whiteBottom = shade(RAMPS.turnip, { bias: 0.35 });

/** Turnip skin: purple shoulders fading to a white belly, split at a dithered band. */
function turnipPaint(cy: number) {
  return (x: number, y: number, nx: number, ny: number): Color => {
    const t = y - cy;
    const band = t < -1 || (t < 1 && (x + y) % 2 === 0);
    return band ? purpleTop(x, y, nx, ny) : whiteBottom(x, y, nx, ny);
  };
}

interface TurnipPose {
  bob: number;
  /** Throwing arm: "hold" bomb at side, "windup" over head, "throw" forward and empty. */
  arm: "hold" | "windup" | "throw";
  /** Leaf spread; panic flares them straight up. */
  leaves: number;
  face: "grump" | "panic";
}

function drawTurnip(c: PixelCanvas, p: TurnipPose): void {
  const cx = 14;
  const cy = 19 + p.bob;
  outlinedLayer(c, OUTLINE, (l) => {
    for (const [dx, lean] of [
      [-3, -0.6],
      [0, 0],
      [3, 0.6],
    ] as const) {
      const spread = lean * p.leaves;
      fillCapsule(
        l,
        cx + dx * 0.5,
        cy - 7,
        cx + dx + spread * 6,
        cy - 14 - (1 - Math.abs(lean)) * 2,
        1.8,
        leafPaint,
      );
    }
  });
  outlinedLayer(c, OUTLINE, (l) => {
    line(l, cx - 3, cy + 7, cx - 4, 30, RAMPS.turnip[3]!); // root legs
    line(l, cx + 3, cy + 7, cx + 4, 30, RAMPS.turnip[3]!);
    fillRect(l, cx - 6, 30, 3, 1, RAMPS.turnip[3]!);
    fillRect(l, cx + 3, 30, 3, 1, RAMPS.turnip[3]!);
    fillEllipse(l, cx, cy, 8, 8, turnipPaint(cy));
  });
  // Face.
  if (p.face === "grump") {
    line(c, cx - 4, cy - 3, cx + 5, cy - 2, OUTLINE); // unibrow
    c.plot(cx - 1, cy - 1, OUTLINE);
    c.plot(cx + 3, cy - 1, OUTLINE);
    fillRect(c, cx - 2, cy + 2, 6, 2, WHITE); // gritted teeth
    for (const tx of [cx - 1, cx + 1, cx + 3]) c.plot(tx, cy + 2, OUTLINE);
    line(c, cx - 3, cy + 2, cx - 3, cy + 3, OUTLINE);
    line(c, cx + 4, cy + 2, cx + 4, cy + 3, OUTLINE);
  } else {
    fillCircle(c, cx - 1, cy - 1, 1.8, OUTLINE);
    fillCircle(c, cx - 1, cy - 1, 1, WHITE);
    fillCircle(c, cx + 3, cy - 1, 1.8, OUTLINE);
    fillCircle(c, cx + 3, cy - 1, 1, WHITE);
    fillEllipse(c, cx + 1, cy + 3, 1.6, 2, OUTLINE);
  }
  // Arm and stink bomb.
  const hand =
    p.arm === "windup"
      ? { x: cx - 4, y: cy - 12 }
      : p.arm === "throw"
        ? { x: cx + 10, y: cy - 2 }
        : { x: cx + 8, y: cy + 3 };
  line(c, cx + 5, cy + 1, hand.x, hand.y, RAMPS.turnip[3]!);
  if (p.arm !== "throw") {
    outlinedLayer(c, OUTLINE, (l) => fillCircle(l, hand.x, hand.y, 3, bombPaint));
    c.plot(hand.x, hand.y - 4, RAMPS.fire[3]!);
    c.plot(hand.x - 1, hand.y - 1, RAMPS.sludge[4]!);
  }
}

export function turnipSheetSpec(): SheetSpec {
  const base: TurnipPose = { bob: 0, arm: "hold", leaves: 1, face: "grump" };
  const frames = (poses: Partial<TurnipPose>[]) =>
    poses.map((p) => (c: PixelCanvas) => drawTurnip(c, { ...base, ...p }));
  return {
    key: TURNIP_SHEET_KEY,
    frameWidth: 30,
    frameHeight: 32,
    originX: 14,
    originY: 31,
    animations: [
      { name: "idle", frameRate: 4, repeat: -1, frames: frames([{}, { bob: 1, leaves: 1.2 }]) },
      {
        name: "windup",
        frameRate: 8,
        repeat: 0,
        frames: frames([
          { arm: "windup", bob: 1 },
          { arm: "windup", bob: 0, leaves: 1.3 },
        ]),
      },
      {
        name: "throw",
        frameRate: 10,
        repeat: 0,
        holds: [0, 150],
        frames: frames([{ arm: "throw", bob: -1 }, { arm: "throw" }]),
      },
      {
        name: "panic",
        frameRate: 10,
        repeat: -1,
        frames: frames([
          { face: "panic", leaves: 0, bob: -1 },
          { face: "panic", leaves: 0.2, bob: -2 },
        ]),
      },
      {
        name: "hurt",
        frameRate: 1,
        repeat: 0,
        frames: frames([{ face: "panic", leaves: 1.6, bob: 1, arm: "throw" }]),
      },
    ],
  };
}
