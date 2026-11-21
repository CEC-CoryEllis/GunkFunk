/**
 * Disco Roach: a glossy cockroach in shades and a gold chain, buzzing about
 * and striking a Saturday-night pose before it dive-bombs you.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { bayer, shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCircle, fillEllipse, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const ROACH_SHEET_KEY = "enemy-roach";

const shellPaint = shade(RAMPS.roachShell, { bias: 0.1 });

interface RoachPose {
  /** Wing angle: 0 down, 1 up. */
  wing: number;
  bob: number;
  disco: boolean;
  eyes: "shades" | "x";
}

/** Wing membrane: a dithered white/cyan sheen. */
function wingPaint(x: number, y: number): number {
  return bayer(x, y) > 0.45 ? RAMPS.cyan[3]! : WHITE;
}

/** Two translucent wing blades flicking up and down behind the shell. */
function drawWings(c: PixelCanvas, wing: number, bob: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    for (const [wx, length, offset] of [
      [10, 8, 0.15],
      [14, 7, -0.15],
    ] as const) {
      const angle = -0.25 - wing * 0.9 + offset;
      fillEllipse(l, wx + Math.cos(angle) * -2, 10 + bob - wing * 2, length, 2.2, wingPaint, angle);
    }
  });
}

function drawRoach(c: PixelCanvas, p: RoachPose): void {
  const by = 13 + p.bob;
  // Six spindly legs dangling.
  for (const [lx, sway] of [
    [11, -1],
    [15, 0],
    [19, 1],
  ] as const) {
    line(c, lx, by + 3, lx + sway - 1, by + 8, OUTLINE);
  }
  drawWings(c, p.wing, p.bob);
  if (p.disco) {
    line(c, 23, by + 1, 28, by - 7, OUTLINE); // pointing to the disco ball
    c.plot(28, by - 8, OUTLINE);
  }
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, 15, by, 9, 4.6, shellPaint);
    fillCircle(l, 25, by - 2, 3.6, shellPaint);
  });
  line(c, 9, by - 2, 20, by - 3, RAMPS.roachShell[4]!); // glossy highlight
  line(c, 15, by - 4, 15, by + 4, RAMPS.roachShell[1]!); // wing-case seam
  // Antennae.
  line(c, 25, by - 5, 21, by - 11, OUTLINE);
  line(c, 26, by - 5, 29, by - 11, OUTLINE);
  // Shades with a glint, or KO eyes.
  if (p.eyes === "shades") {
    fillRect(c, 24, by - 3, 6, 2, OUTLINE);
    c.plot(25, by - 3, WHITE);
  } else {
    line(c, 25, by - 4, 27, by - 2, OUTLINE);
    line(c, 25, by - 2, 27, by - 4, OUTLINE);
  }
  // Gold chain.
  for (const [gx, gy] of [
    [21, by + 1],
    [22, by + 2],
    [23, by + 2],
    [24, by + 1],
  ] as const) {
    c.plot(gx, gy, RAMPS.gold[3]!);
  }
}

export function roachSheetSpec(): SheetSpec {
  const base: RoachPose = { wing: 0, bob: 0, disco: false, eyes: "shades" };
  const frames = (poses: Partial<RoachPose>[]) =>
    poses.map((p) => (c: PixelCanvas) => drawRoach(c, { ...base, ...p }));
  return {
    key: ROACH_SHEET_KEY,
    frameWidth: 32,
    frameHeight: 24,
    originX: 16,
    originY: 14,
    animations: [
      {
        name: "fly",
        frameRate: 18,
        repeat: -1,
        frames: frames([{ wing: 1 }, { wing: 0.5, bob: 1 }, { wing: 0 }, { wing: 0.5, bob: 1 }]),
      },
      {
        name: "disco",
        frameRate: 18,
        repeat: -1,
        frames: frames([
          { wing: 1, disco: true },
          { wing: 0, disco: true, bob: 1 },
        ]),
      },
      {
        name: "swoop",
        frameRate: 20,
        repeat: -1,
        frames: frames([
          { wing: 1, bob: 1 },
          { wing: 0.8, bob: 1 },
        ]),
      },
      { name: "hurt", frameRate: 1, repeat: 0, frames: frames([{ wing: 0.2, eyes: "x" }]) },
    ],
  };
}
