/**
 * Creates the stage's entities from the level's spawn markers.
 */
import { TILE_SIZE } from "../../config/display";
import type { ParsedLevel } from "../../levels/level-format";
import { createEnemy, spawnsAirborne } from "../enemies/enemy-factory";
import { type PickupCollector, WeaponPickup } from "../pickups/weapon-pickup";
import { type PowerUpCollector, PowerUpPickup } from "../powerups/powerup-pickup";
import type { PropContext } from "../props/prop-context";
import { spawnProps } from "../props/prop-factory";
import { TrainingDummy } from "../targets/training-dummy";
import type { StageEntity } from "./stage-context";

export function spawnStageEntities(
  ctx: PropContext,
  level: ParsedLevel,
  collector: PickupCollector & PowerUpCollector,
): StageEntity[] {
  const entities: StageEntity[] = spawnProps(ctx, level);
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
      case "powerUp":
        if (spawn.powerUp)
          entities.push(new PowerUpPickup(ctx, collector, spawn.powerUp, centerX, middleY));
        break;
      case "enemy":
        if (spawn.enemy) {
          entities.push(
            createEnemy(spawn.enemy, ctx, centerX, spawnsAirborne(spawn.enemy) ? middleY : floorY),
          );
        }
        break;
      // Props, walls, secrets and platform stops are built by spawnProps.
      case "prop":
      case "crackedWall":
      case "secret":
      case "platformStop":
      case "playerStart":
        break;
    }
  }
  return entities;
}
