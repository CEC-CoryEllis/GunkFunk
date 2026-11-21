/**
 * Builds boss fights from the level map: each boss (`@`) gets the nearest gate
 * column (`|`) on either side as its arena's entrance and exit.
 */
import { TILE_SIZE } from "../../config/display";
import { groupCells } from "../../levels/cell-regions";
import type { ParsedLevel } from "../../levels/level-format";
import type { Rect } from "../combat/hit-types";
import type { PropContext } from "../props/prop-context";
import type { StageEntity } from "../stage/stage-context";
import { arenaInterior, findArenaGates } from "./arena-gates";
import type { Boss } from "./boss";
import { BossArena } from "./boss-arena";
import type { BossKind } from "./boss-kinds";
import { TheClog } from "./the-clog";

function createBoss(kind: BossKind, ctx: PropContext, x: number, y: number, arena: Rect): Boss {
  switch (kind) {
    case "clog":
      return new TheClog(ctx, { x, y }, arena);
  }
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
    const boss = createBoss(spawn.boss, ctx, x, (spawn.ty + 1) * TILE_SIZE, interior);
    entities.push(boss, new BossArena(ctx, boss, found.entrance, found.exit));
  }
  return entities;
}
