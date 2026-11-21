/**
 * Debug snapshots of the stage's interactive props, for `window.gunkDebug`.
 * Kept out of the prop classes so gameplay code carries no test plumbing.
 */
import { BreakableProp } from "../gameplay/props/breakable-prop";
import { CrackedWall } from "../gameplay/props/cracked-wall";
import { Crate } from "../gameplay/props/crate";
import { Hydrant } from "../gameplay/props/hydrant";
import { ItemPickup } from "../gameplay/props/item-pickup";
import { LaunchToilet } from "../gameplay/props/launch-toilet";
import { MovingPlatform } from "../gameplay/props/moving-platform";
import { SecretZone } from "../gameplay/props/secret-zone";
import { ToxicBarrel } from "../gameplay/props/toxic-barrel";
import { TrashCan } from "../gameplay/props/trash-can";
import { VendingMachine } from "../gameplay/props/vending-machine";
import { VentFan } from "../gameplay/props/vent-fan";
import type { StageEntity } from "../gameplay/stage/stage-context";

export interface PropSnapshot {
  kind: string;
  x: number;
  y: number;
  state: string;
  health?: number;
}

function breakableKind(prop: BreakableProp): string {
  if (prop instanceof Crate) return "crate";
  if (prop instanceof ToxicBarrel) return "barrel";
  if (prop instanceof TrashCan) return "trashCan";
  if (prop instanceof VendingMachine) return "vending";
  return "breakable";
}

function breakableState(prop: BreakableProp): string {
  if (prop instanceof ToxicBarrel && prop.lit) return "lit";
  return prop.isBroken ? "broken" : "intact";
}

export function snapshotProp(entity: StageEntity): PropSnapshot | null {
  if (entity instanceof BreakableProp) {
    return {
      kind: breakableKind(entity),
      x: entity.x,
      y: entity.y,
      state: breakableState(entity),
      health: entity.health,
    };
  }
  if (entity instanceof ItemPickup)
    return { kind: entity.kind, x: entity.x, y: entity.y, state: "item" };
  if (entity instanceof Hydrant) {
    return {
      kind: "hydrant",
      x: entity.x,
      y: entity.y,
      state: entity.spraying ? "spraying" : "idle",
    };
  }
  if (entity instanceof VentFan) return { kind: "fan", x: entity.x, y: entity.y, state: "on" };
  if (entity instanceof LaunchToilet)
    return { kind: "launchToilet", x: entity.x, y: entity.y, state: "ready" };
  if (entity instanceof MovingPlatform) {
    return {
      kind: "platform",
      x: entity.sprite.x,
      y: entity.top,
      state: entity.moving ? "moving" : "paused",
    };
  }
  if (entity instanceof CrackedWall) {
    const box = entity.hurtbox();
    return {
      kind: "crackedWall",
      x: box.x,
      y: box.y,
      state: entity.isBroken ? "broken" : "intact",
    };
  }
  if (entity instanceof SecretZone) {
    const { minTx, minTy } = entity.region;
    return { kind: "secret", x: minTx, y: minTy, state: entity.found ? "found" : "hidden" };
  }
  return null;
}

export function snapshotProps(entities: readonly StageEntity[]): PropSnapshot[] {
  return entities.map(snapshotProp).filter((p): p is PropSnapshot => p !== null);
}
