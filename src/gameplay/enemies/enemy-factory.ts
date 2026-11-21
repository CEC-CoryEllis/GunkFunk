/**
 * Creates enemies by kind — used by the level spawner, blob splits and the
 * debug/test hooks.
 */
import { DiscoRoach } from "./disco-roach";
import type { EnemyContext, EnemySpawnOptions } from "./enemy-context";
import type { Enemy } from "./enemy";
import type { EnemyKind } from "./enemy-kinds";
import { SewerRat } from "./sewer-rat";
import { SludgeBlob } from "./sludge-blob";
import { ToiletChomper } from "./toilet-chomper";
import { TurnipGrenadier } from "./turnip-grenadier";

export function createEnemy(
  kind: EnemyKind,
  ctx: EnemyContext,
  x: number,
  y: number,
  options: EnemySpawnOptions = {},
): Enemy {
  switch (kind) {
    case "rat":
      return new SewerRat(ctx, x, y);
    case "toilet":
      return new ToiletChomper(ctx, x, y);
    case "blob": {
      const velocity =
        options.vx !== undefined ? { vx: options.vx, vy: options.vy ?? 0 } : undefined;
      return new SludgeBlob(ctx, x, y, options.small ?? false, velocity);
    }
    case "turnip":
      return new TurnipGrenadier(ctx, x, y);
    case "roach":
      return new DiscoRoach(ctx, x, y);
  }
}

/** Flyers spawn in the middle of their tile; walkers stand on its floor. */
export function spawnsAirborne(kind: EnemyKind): boolean {
  return kind === "roach";
}
