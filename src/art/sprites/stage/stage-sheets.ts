/**
 * Stage furniture: the checkpoint (a plunger stuck in the floor that pops up a
 * Bulgo pennant when touched), the stage exit (a big outflow pipe under a
 * flashing EXIT sign), and the iron gate bars that seal a boss arena.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { drawPixelMap } from "../../pixel/pixel-map";
import { fillCircle, fillEllipse, fillPolygon, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";

export const CHECKPOINT_SHEET_KEY = "checkpoint";
export const EXIT_SHEET_KEY = "stage-exit";
export const GATE_SHEET_KEY = "arena-gate";

const woodPaint = shade(RAMPS.pipe, { bias: 0.1 });
const rubberPaint = shade(RAMPS.shorts, { bias: 0.05 });
const pipePaint = shade(RAMPS.metal, { bias: -0.05 });
const barPaint = shade(RAMPS.metal, { bias: 0.1 });

// ── Checkpoint ──────────────────────────────────────────────────────────────
const CP_W = 24;
const CP_GROUND = 39;

/** `raise` 0 = drooping grey rag, 1 = flag fully up; `wave` shifts the cloth. */
function checkpoint(c: PixelCanvas, raise: number, wave: number): void {
  const top = CP_GROUND - 34;
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, 12, CP_GROUND - 3, 7, 3.5, rubberPaint); // plunger cup
    fillRect(l, 11, top, 2, CP_GROUND - 5 - top, woodPaint); // handle
  });
  c.set(11, top + 3, RAMPS.pipe[4]!);
  const lit = raise > 0.5;
  const flagTop = top + 1 + Math.round((1 - raise) * 18);
  const cloth = lit ? RAMPS.mutantGreen : RAMPS.metal;
  for (let i = 0; i < 9; i++) {
    const sag = raise < 0.5 ? Math.floor(i / 2) : Math.round(Math.sin(i * 0.8 + wave) * 1.2);
    const height = Math.max(2, 7 - Math.floor(i / 3));
    for (let y = 0; y < height; y++) {
      const shadeIdx = y === 0 ? 3 : y === height - 1 ? 1 : 2;
      c.set(13 + i, flagTop + sag + y, cloth[shadeIdx]!);
    }
    c.set(13 + i, flagTop + sag - 1, OUTLINE);
    c.set(13 + i, flagTop + sag + height, OUTLINE);
  }
  if (lit) {
    // Bulgo's mismatched eyes on the pennant.
    c.set(15, flagTop + 2 + Math.round(Math.sin(0.8 + wave) * 1.2), WHITE);
    c.set(17, flagTop + 2 + Math.round(Math.sin(2.4 + wave) * 1.2), WHITE);
    c.set(16, flagTop + 4 + Math.round(Math.sin(1.6 + wave) * 1.2), OUTLINE);
    fillCircle(c, 12, top - 1, 1.5, RAMPS.gold[3]!);
  }
}

export function checkpointSheetSpec(): SheetSpec {
  return {
    key: CHECKPOINT_SHEET_KEY,
    frameWidth: CP_W,
    frameHeight: CP_GROUND + 1,
    originX: 12,
    originY: CP_GROUND,
    animations: [
      { name: "idle", frameRate: 1, repeat: 0, frames: [(c) => checkpoint(c, 0, 0)] },
      {
        name: "raise",
        frameRate: 14,
        repeat: 0,
        frames: [0.3, 0.6, 0.9, 1].map((r) => (c: PixelCanvas) => checkpoint(c, r, r * 3)),
      },
      {
        name: "wave",
        frameRate: 8,
        repeat: -1,
        frames: [0, 1, 2, 3].map((w) => (c: PixelCanvas) => checkpoint(c, 1, (w * Math.PI) / 2)),
      },
    ],
  };
}

// ── Stage exit ──────────────────────────────────────────────────────────────
const EXIT_W = 48;
const EXIT_GROUND = 63;

const LETTERS = [
  ["eee", "e..", "ee.", "e..", "eee"],
  ["e.e", "e.e", ".e.", "e.e", "e.e"],
  ["eee", ".e.", ".e.", ".e.", "eee"],
  ["eee", ".e.", ".e.", ".e.", ".e."],
];

function exitPipe(c: PixelCanvas, lightOn: boolean): void {
  const cy = EXIT_GROUND - 15;
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 4, cy - 16, 40, 32, pipePaint); // pipe collar
    fillRect(l, 2, cy - 18, 44, 4, pipePaint);
    fillRect(l, 2, cy + 14, 44, 2, pipePaint);
  });
  fillEllipse(c, 24, cy, 15, 13, RAMPS.murk[0]!); // the dark way out
  fillEllipse(c, 24, cy + 2, 11, 9, lightOn ? RAMPS.sludge[1]! : RAMPS.murk[1]!);
  fillEllipse(c, 24, cy + 5, 7, 4, lightOn ? RAMPS.sludge[3]! : RAMPS.sludge[1]!);
  for (const x of [6, 41]) {
    for (const y of [cy - 12, cy + 10]) c.set(x, y, RAMPS.metal[4]!);
  }
  // The sign, hanging on two chains.
  line(c, 14, 0, 14, 6, RAMPS.metal[2]!);
  line(c, 34, 0, 34, 6, RAMPS.metal[2]!);
  outlinedLayer(c, OUTLINE, (l) => fillRect(l, 9, 6, 30, 11, RAMPS.uiPurple[1]!));
  const letterColor = lightOn ? RAMPS.mutantGreen[4]! : RAMPS.mutantGreen[1]!;
  LETTERS.forEach((map, i) => drawPixelMap(c, 12 + i * 6, 9, map, { e: letterColor }));
  if (lightOn) {
    fillPolygon(
      c,
      [
        [21, 20],
        [27, 20],
        [24, 24],
      ],
      RAMPS.gold[3]!,
    );
  }
}

export function exitSheetSpec(): SheetSpec {
  return {
    key: EXIT_SHEET_KEY,
    frameWidth: EXIT_W,
    frameHeight: EXIT_GROUND + 1,
    originX: EXIT_W / 2,
    originY: EXIT_GROUND,
    animations: [
      {
        name: "exit",
        frameRate: 3,
        repeat: -1,
        frames: [(c) => exitPipe(c, true), (c) => exitPipe(c, false)],
      },
    ],
  };
}

// ── Arena gate ──────────────────────────────────────────────────────────────
function gate(c: PixelCanvas): void {
  outlinedLayer(c, OUTLINE, (l) => {
    for (const x of [2, 7, 12]) fillRect(l, x, 0, 3, 16, barPaint);
    fillRect(l, 0, 6, 16, 3, barPaint);
  });
  for (const x of [3, 8, 13]) c.set(x, 7, RAMPS.gold[3]!); // rivets
}

export function gateSheetSpec(): SheetSpec {
  return {
    key: GATE_SHEET_KEY,
    frameWidth: 16,
    frameHeight: 16,
    originX: 0,
    originY: 0,
    animations: [{ name: "gate", frameRate: 1, repeat: 0, frames: [gate] }],
  };
}
