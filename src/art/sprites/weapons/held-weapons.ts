/**
 * The weapons Bulgo holds out in his fist. One idle and one recoil frame per
 * weapon level; the art grows with the level (extra barrels, bigger tanks,
 * more chickens) so upgrades are visible at a glance.
 *
 * Frame origin is the grip point, which sits inside Bulgo's fist.
 */
import type { WeaponId, WeaponLevelNumber } from "../../../gameplay/weapons/weapon-ids";
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
import type { AnimationSpec, SheetSpec } from "../../pixel/sprite-sheet";

export const HELD_SHEET_KEY = "weapons-held";
const W = 36;
const H = 28;
const GRIP_X = 7;
const GRIP_Y = 14;
/** Muzzle position relative to the grip, used to spawn projectiles. */
export const MUZZLE_OFFSET = { x: 26, y: 0 } as const;

const metalPaint = shade(RAMPS.metal, { bias: 0.05 });
const drumPaint = shade(RAMPS.pipe, { bias: 0.1 });
const glassPaint = shade(RAMPS.cyan, { bias: -0.1 });
const slimePaint = shade(RAMPS.sludge, { bias: 0.1 });
const nosePaint = shade(RAMPS.flesh, { bias: 0.15 });
const woodPaint = shade(RAMPS.pipe, { bias: -0.05 });
const chickenPaint = shade(RAMPS.gold, { bias: 0.15 });

function muzzleFlash(c: PixelCanvas, x: number, y: number): void {
  fillPolygon(
    c,
    [
      [x, y - 4],
      [x + 3, y - 1],
      [x + 7, y],
      [x + 3, y + 1],
      [x, y + 4],
      [x + 1, y],
    ],
    RAMPS.gold[3]!,
  );
  fillCircle(c, x + 1.5, y, 1.5, WHITE);
}

function drawSockCannon(c: PixelCanvas, level: WeaponLevelNumber, recoil: boolean): void {
  const kick = recoil ? -2 : 0;
  const barrels = level === 1 ? [0] : level === 2 ? [-3, 3] : [-5, 0, 5];
  const radius = level === 3 ? 2.4 : 3;
  // Sock drum magazine, peeking out behind the top barrel.
  outlinedLayer(c, OUTLINE, (l) =>
    fillCircle(l, 14 + kick, GRIP_Y + barrels[0]! - radius - 2, 4.5, drumPaint),
  );
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 1 + kick, GRIP_Y - 2, 7, 5, drumPaint); // stock
    for (const dy of barrels) {
      fillCapsule(l, 6 + kick, GRIP_Y + dy, 30 + kick, GRIP_Y + dy, radius, metalPaint);
    }
  });
  for (const dy of barrels) {
    // Tube-sock stripes around each barrel, and a dark bore.
    fillRect(c, 22 + kick, GRIP_Y + dy - radius, 1, radius * 2 + 1, RAMPS.shorts[2]!);
    fillRect(c, 25 + kick, GRIP_Y + dy - radius, 1, radius * 2 + 1, RAMPS.iris[2]!);
    fillEllipse(c, 31 + kick, GRIP_Y + dy, 1, radius - 0.5, RAMPS.murk[0]!);
    if (recoil) muzzleFlash(c, 32 + kick, GRIP_Y + dy);
  }
  if (!recoil) {
    // A sock dangling out of the bottom barrel.
    const dy = barrels[barrels.length - 1]!;
    line(c, 31, GRIP_Y + dy + 1, 32, GRIP_Y + dy + 5, WHITE);
    line(c, 32, GRIP_Y + dy + 1, 33, GRIP_Y + dy + 5, RAMPS.eyeWhite[1]!);
  }
}

function drawSnotBlaster(c: PixelCanvas, level: WeaponLevelNumber, recoil: boolean): void {
  const kick = recoil ? -2 : 0;
  const tankRx = 5 + level;
  const noseR = level === 3 ? 6.5 : 5.5;
  outlinedLayer(c, OUTLINE, (l) => {
    fillCapsule(l, 4 + kick, GRIP_Y, 22 + kick, GRIP_Y, 3, drumPaint); // pump tube
    fillEllipse(l, 13 + kick, GRIP_Y - 6, tankRx, 4, glassPaint); // slime tank
    fillEllipse(
      l,
      27 + kick,
      GRIP_Y,
      noseR * (recoil ? 1.2 : 1),
      noseR * (recoil ? 0.8 : 1),
      nosePaint,
    );
  });
  fillEllipse(c, 13 + kick, GRIP_Y - 5, tankRx - 1.5, 2.5, slimePaint);
  c.plot(10 + kick, GRIP_Y - 8, WHITE);
  const nostrils = level === 3 ? [-2, 2] : [1];
  for (const dy of nostrils) fillEllipse(c, 31 + kick, GRIP_Y + dy, 1.2, 1.4, RAMPS.flesh[0]!);
  if (recoil) {
    fillCircle(c, 35, GRIP_Y, 2.5, OUTLINE);
    fillCircle(c, 35, GRIP_Y, 1.6, RAMPS.sludge[3]!);
  } else {
    fillCapsule(c, 31, GRIP_Y + 3, 31, GRIP_Y + 7, 1.2, RAMPS.sludge[3]!); // drip
  }
}

function drawChickenHead(c: PixelCanvas, x: number, y: number, angry: boolean): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillCircle(l, x, y, 3.2, chickenPaint);
    fillCircle(l, x - 0.5, y - 3.5, 1.6, RAMPS.fire[1]!);
    fillPolygon(
      l,
      [
        [x + 2, y - 1],
        [x + 6, y + 0.5],
        [x + 2, y + 2],
      ],
      RAMPS.fire[2]!,
    );
  });
  c.plot(x + 1, y - 1, OUTLINE);
  if (angry) line(c, x - 1, y - 3, x + 2, y - 2, OUTLINE);
}

function drawChickenLauncher(c: PixelCanvas, level: WeaponLevelNumber, recoil: boolean): void {
  const kick = recoil ? -2 : 0;
  outlinedLayer(c, OUTLINE, (l) => {
    fillRect(l, 2 + kick, GRIP_Y - 6, 22, 12, woodPaint);
  });
  for (const px of [8, 14, 20])
    line(c, px + kick, GRIP_Y - 6, px + kick, GRIP_Y + 5, RAMPS.pipe[0]!);
  fillRect(c, 23 + kick, GRIP_Y - 5, 2, 10, RAMPS.murk[0]!);
  const heads = level === 1 ? [0] : level === 2 ? [-3, 3] : [-5, 0, 5];
  for (const dy of heads)
    drawChickenHead(c, 26 + kick + (recoil ? -2 : 0), GRIP_Y + dy, level === 3);
  if (recoil) muzzleFlash(c, 30, GRIP_Y);
}

function drawHeld(c: PixelCanvas, id: WeaponId, level: WeaponLevelNumber, recoil: boolean): void {
  if (id === "sock") drawSockCannon(c, level, recoil);
  else if (id === "snot") drawSnotBlaster(c, level, recoil);
  else drawChickenLauncher(c, level, recoil);
}

export function heldAnimationName(id: WeaponId, level: WeaponLevelNumber, firing: boolean): string {
  return `${id}${level}${firing ? "-fire" : ""}`;
}

export function heldWeaponSheetSpec(): SheetSpec {
  const animations: AnimationSpec[] = [];
  for (const id of ["sock", "snot", "chicken"] as const) {
    for (const level of [1, 2, 3] as const) {
      animations.push({
        name: heldAnimationName(id, level, false),
        frameRate: 1,
        repeat: 0,
        frames: [(c) => drawHeld(c, id, level, false)],
      });
      animations.push({
        name: heldAnimationName(id, level, true),
        frameRate: 20,
        repeat: 0,
        frames: [(c) => drawHeld(c, id, level, true), (c) => drawHeld(c, id, level, false)],
      });
    }
  }
  return {
    key: HELD_SHEET_KEY,
    frameWidth: W,
    frameHeight: H,
    originX: GRIP_X,
    originY: GRIP_Y,
    animations,
  };
}
