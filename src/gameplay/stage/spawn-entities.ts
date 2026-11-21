/**
 * Creates the stage's entities from the level's spawn markers.
 */
import { TILE_SIZE } from "../../config/display";
import type { ParsedLevel } from "../../levels/level-format";
import type { EnemyContext } from "../enemies/enemy-context";
import { createEnemy, spawnsAirborne } from "../enemies/enemy-factory";
import { type PickupCollector, WeaponPickup } from "../pickups/weapon-pickup";
import { TrainingDummy } from "../targets/training-dummy";
import type { StageEntity } from "./stage-context";

export function spawnStageEntities(
  ctx: EnemyContext,
  level: ParsedLevel,
  collector: PickupCollector,
): StageEntity[] {
  const entities: StageEntity[] = [];
  for (const spawn of level.spawns) {
    const centerX = spawn.tx * TILE_SIZE + TILE_SIZE / 2;
    const floorY = (spawn.ty + 1) * TILE_SIZE;
    const middleY = floorY - TILE_SIZE / 2;
    switch (spawn.kind) {
      case "dummy":
        entities.push(new TrainingDummy(ctx, centerX, floorY));
        break;
      case "weaponPickup":
        if (spawn.weapon)
          entities.push(new WeaponPickup(ctx, collector, spawn.weapon, centerX, middleY));
        break;
      case "enemy":
        if (spawn.enemy) {
          entities.push(
            createEnemy(spawn.enemy, ctx, centerX, spawnsAirborne(spawn.enemy) ? middleY : floorY),
          );
        }
        break;
      case "playerStart":
        break;
    }
  }
  return entities;
}
