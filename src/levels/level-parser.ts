/**
 * Turns an ASCII `LevelDefinition` into terrain + spawn data. Pure (no Phaser)
 * so level validity can be unit tested.
 */
import {
  type LevelDefinition,
  type ParsedLevel,
  SPAWN_LEGEND,
  type Spawn,
  TERRAIN_LEGEND,
  type TerrainKind,
} from "./level-format";

export class LevelParseError extends Error {}

export function parseLevel(level: LevelDefinition): ParsedLevel {
  const heightTiles = level.rows.length;
  const widthTiles = Math.max(...level.rows.map((r) => r.length));
  if (heightTiles === 0 || widthTiles === 0) {
    throw new LevelParseError(`Level "${level.id}" is empty`);
  }

  const terrain: TerrainKind[][] = [];
  const spawns: Spawn[] = [];
  level.rows.forEach((row, ty) => {
    const line: TerrainKind[] = [];
    for (let tx = 0; tx < widthTiles; tx++) {
      const ch = row[tx] ?? ".";
      const kind = TERRAIN_LEGEND[ch];
      const spawn = SPAWN_LEGEND[ch];
      if (kind !== undefined) {
        line.push(kind);
      } else if (spawn !== undefined) {
        spawns.push({ kind: spawn, tx, ty });
        line.push("empty");
      } else {
        throw new LevelParseError(
          `Level "${level.id}" has unknown character "${ch}" at ${tx},${ty}`,
        );
      }
    }
    terrain.push(line);
  });

  const starts = spawns.filter((s) => s.kind === "playerStart");
  if (starts.length !== 1) {
    throw new LevelParseError(
      `Level "${level.id}" needs exactly one player start (P), found ${starts.length}`,
    );
  }
  const start = starts[0]!;
  return { widthTiles, heightTiles, terrain, spawns, playerStart: { tx: start.tx, ty: start.ty } };
}

export function terrainAt(level: ParsedLevel, tx: number, ty: number): TerrainKind {
  // Outside the map counts as solid on the sides/bottom so edges autotile cleanly
  // and nothing can escape; above the map is open sky.
  if (ty < 0) return "empty";
  if (tx < 0 || tx >= level.widthTiles || ty >= level.heightTiles) return "solid";
  return level.terrain[ty]![tx]!;
}

/** Autotile neighbour mask: N=1, E=2, S=4, W=8 (bit set = neighbour is solid). */
export function solidMask(level: ParsedLevel, tx: number, ty: number): number {
  const solid = (x: number, y: number) => terrainAt(level, x, y) === "solid";
  return (
    (solid(tx, ty - 1) ? 1 : 0) |
    (solid(tx + 1, ty) ? 2 : 0) |
    (solid(tx, ty + 1) ? 4 : 0) |
    (solid(tx - 1, ty) ? 8 : 0)
  );
}

/** Groups horizontal runs of a terrain kind (hazard volumes are built per run, not per tile). */
export function horizontalRuns(
  level: ParsedLevel,
  kind: TerrainKind,
): { tx: number; ty: number; length: number }[] {
  const runs: { tx: number; ty: number; length: number }[] = [];
  level.terrain.forEach((row, ty) => {
    let start = -1;
    for (let tx = 0; tx <= row.length; tx++) {
      const match = row[tx] === kind;
      if (match && start < 0) start = tx;
      if (!match && start >= 0) {
        runs.push({ tx: start, ty, length: tx - start });
        start = -1;
      }
    }
  });
  return runs;
}
