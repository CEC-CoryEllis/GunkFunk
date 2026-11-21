/**
 * Works out where a moving platform travels from the level map. A platform
 * (a run of `=`) shuttles between the `:` stop markers that share its row
 * (sideways) or its columns (up and down); the platform's own spot counts as
 * an end if all its stops are on one side. Pure, so it's unit tested.
 */
import type { Cell, CellRegion } from "../../levels/cell-regions";

export interface PlatformPath {
  /** Both ends, as the tile position of the platform's left cell. */
  from: Cell;
  to: Cell;
}

export function platformPath(platform: CellRegion, stops: readonly Cell[]): PlatformPath | null {
  const row = platform.minTy;
  const sideways = stops.filter((s) => s.ty === row);
  if (sideways.length > 0) {
    const width = platform.maxTx - platform.minTx;
    // A stop on the right means the platform's right edge reaches it.
    const lefts = sideways.map((s) => (s.tx > platform.maxTx ? s.tx - width : s.tx));
    const minTx = Math.min(platform.minTx, ...lefts);
    const maxTx = Math.max(platform.minTx, ...lefts);
    return { from: { tx: minTx, ty: row }, to: { tx: maxTx, ty: row } };
  }
  const vertical = stops.filter((s) => s.tx >= platform.minTx && s.tx <= platform.maxTx);
  if (vertical.length > 0) {
    const minTy = Math.min(row, ...vertical.map((s) => s.ty));
    const maxTy = Math.max(row, ...vertical.map((s) => s.ty));
    return { from: { tx: platform.minTx, ty: minTy }, to: { tx: platform.minTx, ty: maxTy } };
  }
  return null;
}
