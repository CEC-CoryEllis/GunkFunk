/**
 * Every generated sprite sheet in the game. Both the in-game texture registry
 * and the PNG review export read from this list, so a sheet added here shows
 * up everywhere.
 */
import type { SheetSpec } from "./pixel/sprite-sheet";
import { bulgoSheetSpec } from "./sprites/bulgo/bulgo-sheet";
import { fxSheetSpecs } from "./sprites/fx/fx-sheets";
import { sludgeSheetSpec } from "./sprites/hazards/sludge";

export function spriteCatalog(): SheetSpec[] {
  return [bulgoSheetSpec(), sludgeSheetSpec(), ...fxSheetSpecs()];
}
