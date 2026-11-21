/**
 * PROFESSOR STINKBOTTOM — disgraced hygiene scientist, World 1's villain.
 * Wild white hair, a gas mask pushed up into round green goggles, buck teeth,
 * a stained lab coat and a pink bow tie. A cockpit bust for riding in the
 * Flush-o-Tron, and a flailing full-body frame for being ejected from it.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import {
  fillCapsule,
  fillCircle,
  fillEllipse,
  fillPolygon,
  fillRect,
  line,
} from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const STINKBOTTOM_SHEET_KEY = "stinkbottom";
const W = 40;
const H = 44;

const skin = shade(RAMPS.slimeGrime, { bias: 0.6 });
const hair = shade(RAMPS.porcelain, { bias: 0.1 });
const coat = shade(RAMPS.porcelain, { bias: -0.05 });
const goggleRim = shade(RAMPS.metal, { bias: 0.1 });

type Face = "laugh" | "grin" | "shout" | "hurt" | "dizzy";

/** The head, centred at (cx, cy). */
function head(c: PixelCanvas, cx: number, cy: number, face: Face, shake: number): void {
  const x = cx + shake;
  outlinedLayer(c, OUTLINE, (l) => {
    // Hair: an explosion of white puffs behind the head.
    for (const [dx, dy, r] of [
      [-9, -4, 4],
      [-7, -9, 4],
      [-1, -11, 4.5],
      [6, -9, 4],
      [9, -3, 3.5],
      [-10, 2, 3],
    ] as const) {
      fillCircle(l, x + dx, cy + dy, r, hair);
    }
    fillEllipse(l, x, cy, 7.5, 8.5, skin);
    fillPolygon(
      l,
      [
        [x + 5, cy - 1],
        [x + 11, cy + 2],
        [x + 5, cy + 3],
      ],
      skin,
    ); // long nose
  });
  // Goggles pushed up on the forehead.
  for (const gx of [-3, 3]) {
    fillCircle(c, x + gx, cy - 4, 3, OUTLINE);
    fillCircle(c, x + gx, cy - 4, 2.2, goggleRim);
    fillCircle(c, x + gx, cy - 4, 1.4, RAMPS.sludge[3]!);
  }
  c.set(x - 4, cy - 5, WHITE);
  drawEyes(c, x, cy, face);
  drawMouth(c, x, cy, face);
}

function drawEyes(c: PixelCanvas, x: number, cy: number, face: Face): void {
  if (face === "dizzy") {
    for (const ex of [x - 2, x + 3]) {
      line(c, ex - 1, cy - 1, ex + 1, cy + 1, OUTLINE);
      line(c, ex + 1, cy - 1, ex - 1, cy + 1, OUTLINE);
    }
    return;
  }
  if (face === "hurt") {
    line(c, x - 3, cy, x - 1, cy, OUTLINE);
    line(c, x + 2, cy, x + 4, cy, OUTLINE);
    return;
  }
  for (const ex of [x - 2, x + 3]) {
    fillRect(c, ex - 1, cy - 1, 2, 2, WHITE);
    c.set(ex, cy, OUTLINE);
  }
  if (face === "shout") {
    line(c, x - 4, cy - 3, x - 1, cy - 2, OUTLINE);
    line(c, x + 5, cy - 3, x + 2, cy - 2, OUTLINE);
  }
}

function drawMouth(c: PixelCanvas, x: number, cy: number, face: Face): void {
  const my = cy + 5;
  if (face === "laugh" || face === "shout") {
    fillEllipse(c, x + 1, my, face === "shout" ? 3.5 : 3, face === "shout" ? 2.5 : 2, OUTLINE);
    fillRect(c, x, my - 2, 3, 2, RAMPS.teeth[2]!); // buck teeth
    return;
  }
  line(c, x - 2, my, x + 4, my - (face === "grin" ? 1 : -1), OUTLINE);
  if (face === "grin") fillRect(c, x, my - 1, 3, 2, RAMPS.teeth[2]!);
  if (face === "hurt") c.set(x + 7, cy - 6, RAMPS.cyan[3]!); // sweat
}

function collar(c: PixelCanvas, cx: number, top: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillPolygon(
      l,
      [
        [cx - 12, H - 1],
        [cx - 9, top],
        [cx + 9, top],
        [cx + 12, H - 1],
      ],
      coat,
    );
  });
  fillPolygon(
    c,
    [
      [cx - 3, top + 1],
      [cx, top + 4],
      [cx - 3, top + 7],
    ],
    RAMPS.hotPink[2]!,
  );
  fillPolygon(
    c,
    [
      [cx + 3, top + 1],
      [cx, top + 4],
      [cx + 3, top + 7],
    ],
    RAMPS.hotPink[2]!,
  );
  c.set(cx, top + 4, RAMPS.hotPink[3]!);
  fillCircle(c, cx + 7, top + 8, 1.5, RAMPS.sludge[2]!); // a stain
}

/** Cockpit bust: head and shoulders popping out of the toilet. */
function bust(c: PixelCanvas, face: Face, shake: number): void {
  collar(c, W / 2, H - 12);
  head(c, W / 2, H - 22, face, shake);
}

/** Ejected: tumbling through the air shaking a fist. */
function ejected(c: PixelCanvas, flail: number): void {
  const cx = W / 2;
  outlinedLayer(c, OUTLINE, (l) => {
    fillCapsule(l, cx - 4, 30, cx - 9 - flail * 2, 42, 2.2, shade(RAMPS.metal, { bias: -0.2 }));
    fillCapsule(l, cx + 4, 30, cx + 8 + flail * 2, 41, 2.2, shade(RAMPS.metal, { bias: -0.2 }));
    fillEllipse(l, cx, 26, 8, 8, coat);
    fillCapsule(l, cx - 6, 22, cx - 14, 14 - flail * 3, 2, coat);
    fillCapsule(l, cx + 6, 22, cx + 14, 12 + flail * 2, 2, coat);
    fillCircle(l, cx + 14, 11 + flail * 2, 2.6, skin); // fist
    fillCircle(l, cx - 14, 13 - flail * 3, 2.2, skin);
  });
  head(c, cx, 12, "shout", 0);
}

export function stinkbottomSheetSpec(): SheetSpec {
  return {
    key: STINKBOTTOM_SHEET_KEY,
    frameWidth: W,
    frameHeight: H,
    originX: W / 2,
    originY: H - 1,
    animations: [
      {
        name: "laugh",
        frameRate: 8,
        repeat: -1,
        frames: [(c) => bust(c, "laugh", 0), (c) => bust(c, "grin", 1)],
      },
      {
        name: "shout",
        frameRate: 10,
        repeat: -1,
        frames: [(c) => bust(c, "shout", 0), (c) => bust(c, "shout", 1)],
      },
      { name: "hurt", frameRate: 1, repeat: 0, frames: [(c) => bust(c, "hurt", 0)] },
      {
        name: "dizzy",
        frameRate: 4,
        repeat: -1,
        frames: [(c) => bust(c, "dizzy", -1), (c) => bust(c, "dizzy", 1)],
      },
      {
        name: "ejected",
        frameRate: 10,
        repeat: -1,
        frames: [(c) => ejected(c, 0), (c) => ejected(c, 1)],
      },
    ],
  };
}
