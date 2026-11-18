/**
 * Weapon pickups float in a shimmering soap bubble (this is a sewer; the
 * bubbles are the cleanest thing in it). Also exports the bare 16×16 icon
 * sheet used by the HUD.
 */
import { WEAPON_IDS } from "../../../gameplay/weapons/weapon-ids";
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import type { PixelCanvas } from "../../pixel/pixel-canvas";
import { fillCircle } from "../../pixel/shapes";
import type { SheetSpec } from "../../pixel/sprite-sheet";
import { drawWeaponIcon } from "./weapon-icons";

export const PICKUP_SHEET_KEY = "pickups";
export const WEAPON_ICON_SHEET_KEY = "weapon-icons";

const SIZE = 24;
const C = SIZE / 2;

function bubble(c: PixelCanvas, phase: number): void {
  const r = 10.5;
  // Ring only: an outlined circle with an iridescent rim that shifts each frame.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x + 0.5 - C, y + 0.5 - C);
      if (d > r - 0.5 && d <= r + 0.5) {
        const angle = Math.atan2(y - C, x - C) + phase;
        const hue = Math.sin(angle * 2);
        c.set(x, y, hue > 0.3 ? RAMPS.cyan[2]! : hue < -0.3 ? RAMPS.hotPink[3]! : RAMPS.cyan[3]!);
      } else if (d > r + 0.5 && d <= r + 1.5) {
        c.set(x, y, OUTLINE);
      }
    }
  }
  fillCircle(c, C - 5, C - 5, 1.6, WHITE);
  c.plot(C - 2, C - 7, WHITE);
}

export function pickupSheetSpec(): SheetSpec {
  return {
    key: PICKUP_SHEET_KEY,
    frameWidth: SIZE,
    frameHeight: SIZE,
    originX: C,
    originY: C,
    animations: WEAPON_IDS.map((id) => ({
      name: id,
      frameRate: 6,
      repeat: -1,
      frames: [0, 1, 2, 3].map((i) => (c: PixelCanvas) => {
        bubble(c, (i / 4) * Math.PI);
        drawWeaponIcon(c, id, C - 8, C - 8 + (i === 1 || i === 2 ? 1 : 0));
      }),
    })),
  };
}

export function weaponIconSheetSpec(): SheetSpec {
  return {
    key: WEAPON_ICON_SHEET_KEY,
    frameWidth: 16,
    frameHeight: 16,
    originX: 8,
    originY: 8,
    animations: WEAPON_IDS.map((id) => ({
      name: id,
      frameRate: 1,
      repeat: 0,
      frames: [(c: PixelCanvas) => drawWeaponIcon(c, id, 0, 0)],
    })),
  };
}
