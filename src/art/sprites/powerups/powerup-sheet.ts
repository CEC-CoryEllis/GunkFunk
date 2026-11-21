/**
 * Power-up pickups: each icon spins in a golden sunburst, so they never read
 * as weapon bubbles. Also the bare 16×16 icons for the HUD timers, and the
 * glossy grease slicks Hyper Grease leaves on the floor.
 */
import { POWERUP_IDS, type PowerUpId } from "../../../gameplay/powerups/powerup-ids";
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { overlay, shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCircle, fillEllipse, fillPolygon, fillRect, line } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";
import { drawWeaponIcon } from "../weapons/weapon-icons";

export const POWERUP_SHEET_KEY = "powerups";
export const POWERUP_ICON_SHEET_KEY = "powerup-icons";
export const GREASE_SHEET_KEY = "grease-slick";

const SIZE = 24;
const C = SIZE / 2;

const ballSkin = shade(RAMPS.mutantGreen, { bias: 0.15 });
const canPaint = shade(RAMPS.gold, { bias: -0.1 });
const greasePaint = shade(RAMPS.pipe, { bias: -0.15 });

function sunburst(c: PixelCanvas, phase: number): void {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + phase;
    const inner = 7;
    const outer = i % 2 === 0 ? 11.5 : 9.5;
    const spread = 0.16;
    fillPolygon(
      c,
      [
        [C + Math.cos(a - spread) * inner, C + Math.sin(a - spread) * inner],
        [C + Math.cos(a) * outer, C + Math.sin(a) * outer],
        [C + Math.cos(a + spread) * inner, C + Math.sin(a + spread) * inner],
      ],
      i % 2 === 0 ? RAMPS.gold[3]! : RAMPS.gold[2]!,
    );
  }
  fillCircle(c, C, C, 8, RAMPS.gold[1]!);
  fillCircle(c, C, C, 7, RAMPS.uiPurple[1]!);
}

function ballIcon(c: PixelCanvas, ox: number, oy: number): void {
  const spots = (x: number, y: number) =>
    Math.hypot(x - (ox + 5), y - (oy + 11)) < 2 || Math.hypot(x - (ox + 10), y - (oy + 12)) < 1.5;
  outlinedLayer(c, OUTLINE, (l) =>
    fillCircle(l, ox + 8, oy + 8.5, 6, overlay(ballSkin, spots, shade(RAMPS.mutantSpot))),
  );
  fillCircle(c, ox + 8, oy + 6, 1.6, WHITE);
  c.set(ox + 9, oy + 6, OUTLINE);
  fillCircle(c, ox + 11.5, oy + 6.5, 1.2, WHITE);
  c.set(ox + 12, oy + 7, OUTLINE);
  line(c, ox + 8, oy + 10, ox + 12, oy + 10, OUTLINE);
  c.set(ox + 9, oy + 9, RAMPS.teeth[2]!);
  c.set(ox + 11, oy + 9, RAMPS.teeth[2]!);
}

function socksIcon(c: PixelCanvas, ox: number, oy: number): void {
  drawWeaponIcon(c, "sock", ox - 1, oy - 2);
  // A little infinity sign in the corner.
  for (const dx of [0, 4]) {
    fillCircle(c, ox + 9.5 + dx, oy + 12.5, 2.4, OUTLINE);
    fillCircle(c, ox + 9.5 + dx, oy + 12.5, 1.6, RAMPS.gold[3]!);
    fillCircle(c, ox + 9.5 + dx, oy + 12.5, 0.7, OUTLINE);
  }
}

function greaseIcon(c: PixelCanvas, ox: number, oy: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, ox + 5, oy + 6, 8, 8, canPaint);
    fillPolygon(
      l,
      [
        [ox + 6, oy + 7],
        [ox + 1, oy + 3],
        [ox + 2, oy + 2],
        [ox + 8, oy + 6],
      ],
      canPaint,
    );
    fillRect(l, ox + 7, oy + 3, 3, 3, canPaint);
  });
  line(c, ox + 6, oy + 10, ox + 12, oy + 10, RAMPS.gold[0]!);
  fillEllipse(c, ox + 2, oy + 7, 1, 1.6, RAMPS.pipe[1]!);
  c.set(ox + 2, oy + 6, RAMPS.pipe[3]!);
}

export function drawPowerUpIcon(c: PixelCanvas, id: PowerUpId, ox: number, oy: number): void {
  if (id === "wreckingBall") ballIcon(c, ox, oy);
  else if (id === "infiniteSocks") socksIcon(c, ox, oy);
  else greaseIcon(c, ox, oy);
}

export function powerUpSheetSpec(): SheetSpec {
  return {
    key: POWERUP_SHEET_KEY,
    frameWidth: SIZE,
    frameHeight: SIZE,
    originX: C,
    originY: C,
    animations: POWERUP_IDS.map((id) => ({
      name: id,
      frameRate: 8,
      repeat: -1,
      frames: [0, 1, 2, 3].map((i) => (c: PixelCanvas) => {
        sunburst(c, (i / 4) * (Math.PI / 4));
        drawPowerUpIcon(c, id, C - 8, C - 8);
        if (i === 1) c.set(C + 6, C - 6, WHITE);
      }),
    })),
  };
}

export function powerUpIconSheetSpec(): SheetSpec {
  return {
    key: POWERUP_ICON_SHEET_KEY,
    frameWidth: 16,
    frameHeight: 16,
    originX: 0,
    originY: 0,
    animations: POWERUP_IDS.map((id) => ({
      name: id,
      frameRate: 1,
      repeat: 0,
      frames: [(c: PixelCanvas) => drawPowerUpIcon(c, id, 0, 0)],
    })),
  };
}

function drawSmear(c: PixelCanvas, variant: number): void {
  const rx = 6.5 + variant * 0.5;
  // A flat, lumpy puddle: a long smear plus a splash, with a bright oily sheen.
  outlinedLayer(c, RAMPS.pipe[0]!, (l) => {
    fillEllipse(l, 8, 4, rx, 1.2, greasePaint);
    fillEllipse(l, 8 + (variant - 1) * 3.5, 3.4, 2.6, 1.3, greasePaint);
  });
  line(c, 5 + variant, 3, 8 + variant, 3, RAMPS.gold[4]!);
  c.set(11 - variant * 2, 4, RAMPS.gold[3]!);
}

/** Three glossy grease smears, 16×6, sitting on the floor line. */
export function greaseSheetSpec(): SheetSpec {
  return {
    key: GREASE_SHEET_KEY,
    frameWidth: 16,
    frameHeight: 6,
    originX: 8,
    originY: 5,
    animations: [0, 1, 2].map((v) => ({
      name: `slick${v}`,
      frameRate: 1,
      repeat: 0,
      frames: [(c: PixelCanvas) => drawSmear(c, v)],
    })),
  };
}
