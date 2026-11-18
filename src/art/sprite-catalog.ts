/**
 * Every generated sprite sheet in the game. Both the in-game texture registry
 * and the PNG review export read from this list, so a sheet added here shows
 * up everywhere.
 */
import type { SheetSpec } from "./pixel/sprite-sheet";
import { bulgoSheetSpec } from "./sprites/bulgo/bulgo-sheet";
import { dummySheetSpec } from "./sprites/dummy/dummy-sheet";
import { fxSheetSpecs } from "./sprites/fx/fx-sheets";
import { sludgeSheetSpec } from "./sprites/hazards/sludge";
import { heldWeaponSheetSpec } from "./sprites/weapons/held-weapons";
import { pickupSheetSpec, weaponIconSheetSpec } from "./sprites/weapons/pickup-sheet";
import { projectileSheetSpec } from "./sprites/weapons/projectile-sheet";

export function spriteCatalog(): SheetSpec[] {
  return [
    bulgoSheetSpec(),
    sludgeSheetSpec(),
    ...fxSheetSpecs(),
    heldWeaponSheetSpec(),
    projectileSheetSpec(),
    pickupSheetSpec(),
    weaponIconSheetSpec(),
    dummySheetSpec(),
  ];
}
