/**
 * Builds boss fights from the level map: each boss (`@` or `!`) gets the
 * nearest gate column (`|`) on either side as its arena's entrance and exit,
 * and the fragile grates (`_`) and collapsing floor (`;`) between them as the
 * parts of the arena its fight can wreck.
 */
import { TILE_SIZE } from "../../config/display";
import { type Cell, groupCells } from "../../levels/cell-regions";
import type { ParsedLevel } from "../../levels/level-format";
import type { Rect } from "../combat/hit-types";
import type { PropContext } from "../props/prop-context";
import type { StageEntity } from "../stage/stage-context";
import { arenaInterior, findArenaGates } from "./arena-gates";
import type { Boss } from "./boss";
import { BossArena } from "./boss-arena";
import type { BossKind } from "./boss-kinds";
import { type ArenaDamage, FlushOTron } from "./flushotron";
import { TheClog } from "./the-clog";

function createBoss(
  kind: BossKind,
  ctx: PropContext,
  home: { x: number; y: number },
  arena: Rect,
  wreckage: ArenaDamage,
): Boss {
  switch (kind) {
    case "clog":
      return new TheClog(ctx, home, arena);
    case "flushotron":
      return new FlushOTron(ctx, home, arena, wreckage);
  }
}

/** Cells of one marker kind inside the arena's columns. */
function cellsIn(level: ParsedLevel, kind: "fragile" | "collapse", arena: Rect): Cell[] {
  const minTx = arena.x / TILE_SIZE;
  const maxTx = (arena.x + arena.width) / TILE_SIZE - 1;
  return level.spawns
    .filter((s) => s.kind === kind && s.tx >= minTx && s.tx <= maxTx)
    .map(({ tx, ty }) => ({ tx, ty }));
}

export function spawnBossArenas(ctx: PropContext, level: ParsedLevel): StageEntity[] {
  const gates = groupCells(
    level.spawns.filter((s) => s.kind === "gate").map(({ tx, ty }) => ({ tx, ty })),
  );
  const entities: StageEntity[] = [];
  for (const spawn of level.spawns) {
    if (spawn.kind !== "boss" || !spawn.boss) continue;
    const found = findArenaGates(gates, spawn.tx);
    if (!found) throw new Error(`Boss at ${spawn.tx},${spawn.ty} has no gates on both sides`);
    const x = spawn.tx * TILE_SIZE + TILE_SIZE / 2;
    const interior = arenaInterior(found);
    const wreckage = {
      fragile: cellsIn(level, "fragile", interior),
      collapse: cellsIn(level, "collapse", interior),
    };
    const home = { x, y: (spawn.ty + 1) * TILE_SIZE };
    const boss = createBoss(spawn.boss, ctx, home, interior, wreckage);
    entities.push(boss, new BossArena(ctx, boss, found.entrance, found.exit));
  }
  return entities;
}
