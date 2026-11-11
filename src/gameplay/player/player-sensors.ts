/**
 * Reads the world around the player's physics body into `BodySensors`:
 * floor/wall contact, one-way platforms, ladders and low ceilings.
 */
import type * as Phaser from "phaser";
import type { LevelWorld } from "../../levels/level-world";
import type { BodySensors } from "./movement-controller";

/** How far beyond the body edges walls and floors are probed, in pixels. */
const PROBE = 2;

export function readSensors(
  body: Phaser.Physics.Arcade.Body,
  level: LevelWorld,
  standingHeight: number,
): BodySensors {
  const left = body.left;
  const right = body.right;
  const top = body.top;
  const bottom = body.bottom;
  const cx = body.center.x;
  const solidAt = (x: number, y: number) => level.terrainAtWorld(x, y) === "solid";

  const midY = top + body.height / 2;
  const wallProbe = (x: number) =>
    solidAt(x, top + 3) || solidAt(x, midY) || solidAt(x, bottom - 3);

  const tileBelow = level.layer.getTileAtWorldXY(cx, bottom + PROBE);
  const onPassThrough = body.blocked.down && tileBelow !== null && level.isOneWayTile(tileBelow);

  const ladderX = level.ladderCenterNear(cx, midY) ?? level.ladderCenterNear(cx, bottom - 2);
  const ladderBelow = body.blocked.down && level.terrainAtWorld(cx, bottom + PROBE) === "ladder";

  // Would a standing body fit? Probe the full standing height above the feet.
  const headY = bottom - standingHeight + 1;
  const ceilingLow = solidAt(left + 2, headY) || solidAt(right - 2, headY) || solidAt(cx, headY);

  return {
    vx: body.velocity.x,
    vy: body.velocity.y,
    onFloor: body.blocked.down,
    onPassThrough,
    wallLeft: body.blocked.left || wallProbe(left - PROBE),
    wallRight: body.blocked.right || wallProbe(right + PROBE),
    onLadder: ladderX !== undefined,
    ladderBelow,
    ladderX: ladderX ?? cx,
    ceilingLow,
  };
}
