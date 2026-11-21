/**
 * Creates the stage's entities from the level's spawn markers.
 */
import { TILE_SIZE } from "../../config/display";
import type { ParsedLevel } from "../../levels/level-format";
import { type PickupCollector, WeaponPickup } from "../pickups/weapon-pickup";
import { TrainingDummy } from "../targets/training-dummy";
import type { StageContext, StageEntity } from "./stage-context";

export function spawnStageEntities(
  ctx: StageContext,
  level: ParsedLevel,
  collector: PickupCollector,
): StageEntity[] {
  const entities: StageEntity[] = [];
  for (const spawn of level.spawns) {
    const centerX = spawn.tx * TILE_SIZE + TILE_SIZE / 2;
    const floorY = (spawn.ty + 1) * TILE_SIZE;
    switch (spawn.kind) {
      case "dummy":
        entities.push(new TrainingDummy(ctx, centerX, floorY));
        break;
      case "weaponPickup":
        if (spawn.weapon) {
          entities.push(
            new WeaponPickup(ctx, collector, spawn.weapon, centerX, floorY - TILE_SIZE / 2),
          );
        }
        break;
      case "playerStart":
        break;
    }
  }
  return entities;
}
