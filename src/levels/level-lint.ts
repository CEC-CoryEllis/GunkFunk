/**
 * Level-design checks that catch layouts the player can't comfortably use.
 * Pure (works on parsed levels), so every shipped stage is linted in unit tests.
 */
import type { ParsedLevel, TerrainKind } from "./level-format";
import { terrainAt } from "./level-parser";

/**
 * Air (in tiles) a surface needs above it to be jumped onto and off: Bulgo is
 * ~2 tiles tall, and arriving on a ledge from a jump needs room for the arc.
 */
export const MIN_HEADROOM_TILES = 4;
/** Exactly one tile of air is a deliberate crawlspace (slide-only tunnels). */
export const CRAWLSPACE_TILES = 1;

export interface HeadroomTrap {
  tx: number;
  ty: number;
  headroom: number;
}

function blocksHead(kind: TerrainKind): boolean {
  return kind === "solid";
}

/** True for tiles you can stand on top of: solid ground, grates and ladder tops. */
function isStandable(level: ParsedLevel, tx: number, ty: number): boolean {
  const kind = terrainAt(level, tx, ty);
  const above = terrainAt(level, tx, ty - 1);
  if (blocksHead(above)) return false;
  if (kind === "solid" || kind === "oneWay") return true;
  return kind === "ladder" && above !== "ladder";
}

/**
 * Surfaces with more than a crawlspace but less than `MIN_HEADROOM_TILES` of
 * air above them: you can stand there, but jumping onto or off them bonks the
 * ceiling. Open sky above the map counts as unlimited headroom.
 */
export function findHeadroomTraps(level: ParsedLevel): HeadroomTrap[] {
  const traps: HeadroomTrap[] = [];
  for (let ty = 1; ty < level.heightTiles; ty++) {
    for (let tx = 0; tx < level.widthTiles; tx++) {
      if (!isStandable(level, tx, ty)) continue;
      let headroom = 0;
      for (let y = ty - 1; y >= 0 && !blocksHead(terrainAt(level, tx, y)); y--) headroom++;
      const openSky = headroom === ty;
      if (!openSky && headroom > CRAWLSPACE_TILES && headroom < MIN_HEADROOM_TILES) {
        traps.push({ tx, ty, headroom });
      }
    }
  }
  return traps;
}
