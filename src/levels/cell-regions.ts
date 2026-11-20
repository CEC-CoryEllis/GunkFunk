/**
 * Groups tile cells into 4-connected regions. Cracked walls break as one
 * piece and secret rooms trigger as one area, however they're drawn.
 */
export interface Cell {
  tx: number;
  ty: number;
}

export interface CellRegion {
  cells: Cell[];
  /** Bounding box in tiles (inclusive). */
  minTx: number;
  minTy: number;
  maxTx: number;
  maxTy: number;
}

const key = (tx: number, ty: number) => `${tx},${ty}`;

export function groupCells(cells: readonly Cell[]): CellRegion[] {
  const remaining = new Map(cells.map((c) => [key(c.tx, c.ty), c]));
  const regions: CellRegion[] = [];
  for (const start of cells) {
    if (!remaining.has(key(start.tx, start.ty))) continue;
    const region: Cell[] = [];
    const queue = [start];
    remaining.delete(key(start.tx, start.ty));
    while (queue.length > 0) {
      const cell = queue.pop()!;
      region.push(cell);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const next = remaining.get(key(cell.tx + dx, cell.ty + dy));
        if (next) {
          remaining.delete(key(next.tx, next.ty));
          queue.push(next);
        }
      }
    }
    regions.push({
      cells: region,
      minTx: Math.min(...region.map((c) => c.tx)),
      minTy: Math.min(...region.map((c) => c.ty)),
      maxTx: Math.max(...region.map((c) => c.tx)),
      maxTy: Math.max(...region.map((c) => c.ty)),
    });
  }
  return regions;
}
