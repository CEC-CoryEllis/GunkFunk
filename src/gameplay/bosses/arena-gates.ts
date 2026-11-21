/**
 * Where a boss arena is: the nearest gate column on each side of the boss,
 * and the floor-to-ceiling space between them. Pure, so it's unit tested.
 */
import { TILE_SIZE } from "../../config/display";
import type { CellRegion } from "../../levels/cell-regions";
import type { Rect } from "../combat/hit-types";

export interface ArenaGates {
  entrance: CellRegion;
  exit: CellRegion;
}

/** The closest gate region left of the boss and the closest one right of it. */
export function findArenaGates(gates: readonly CellRegion[], bossTx: number): ArenaGates | null {
  const entrance = gates
    .filter((g) => g.maxTx < bossTx)
    .reduce<CellRegion | null>((best, g) => (!best || g.maxTx > best.maxTx ? g : best), null);
  const exit = gates
    .filter((g) => g.minTx > bossTx)
    .reduce<CellRegion | null>((best, g) => (!best || g.minTx < best.minTx ? g : best), null);
  return entrance && exit ? { entrance, exit } : null;
}

/** The floor-to-ceiling space between the gates (where ceiling debris falls from). */
export function arenaInterior({ entrance, exit }: ArenaGates): Rect {
  const top = Math.min(entrance.minTy, exit.minTy);
  const bottom = Math.max(entrance.maxTy, exit.maxTy);
  return {
    x: (entrance.maxTx + 1) * TILE_SIZE,
    y: top * TILE_SIZE,
    width: (exit.minTx - entrance.maxTx - 1) * TILE_SIZE,
    height: (bottom - top + 1) * TILE_SIZE,
  };
}
