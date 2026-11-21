/**
 * Every generated sprite sheet in the game. Both the in-game texture registry
 * and the PNG review export read from this list, so a sheet added here shows
 * up everywhere.
 */
import type { SheetSpec } from "./pixel/sprite-sheet";
import { ballSheetSpec } from "./sprites/bulgo/ball-sheet";
import { bulgoSheetSpec } from "./sprites/bulgo/bulgo-sheet";
import { dummySheetSpec } from "./sprites/dummy/dummy-sheet";
import { blobSheetSpec } from "./sprites/enemies/blob-sheet";
import { ratSheetSpec } from "./sprites/enemies/rat-sheet";
import { roachSheetSpec } from "./sprites/enemies/roach-sheet";
import { toiletSheetSpec } from "./sprites/enemies/toilet-sheet";
import { turnipSheetSpec } from "./sprites/enemies/turnip-sheet";
import { fxSheetSpecs } from "./sprites/fx/fx-sheets";
import { itemSheetSpec } from "./sprites/props/item-sheet";
import { largePropSheetSpec } from "./sprites/props/large-props-sheet";
import { smallPropSheetSpec } from "./sprites/props/small-props-sheet";
import { sludgeSheetSpec } from "./sprites/hazards/sludge";
import {
  greaseSheetSpec,
  powerUpIconSheetSpec,
  powerUpSheetSpec,
} from "./sprites/powerups/powerup-sheet";
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
    ratSheetSpec(),
    toiletSheetSpec(),
    blobSheetSpec(),
    turnipSheetSpec(),
    roachSheetSpec(),
    itemSheetSpec(),
    smallPropSheetSpec(),
    largePropSheetSpec(),
    ballSheetSpec(),
    powerUpSheetSpec(),
    powerUpIconSheetSpec(),
    greaseSheetSpec(),
  ];
}
