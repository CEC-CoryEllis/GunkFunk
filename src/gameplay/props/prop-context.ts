/**
 * What interactive props can do to the world: push the player around
 * (launch, lift, carry), feed them, spawn things, lift enemies, and report
 * finds (gems, secrets).
 */
import type * as Phaser from "phaser";
import type { CellRegion } from "../../levels/cell-regions";
import type { Rect } from "../combat/hit-types";
import type { EnemyContext, EnemyTarget } from "../enemies/enemy-context";
import type { StageEntity } from "../stage/stage-context";

/** The player as props see them. */
export interface PropPlayer extends EnemyTarget {
  bodyRect(): Rect;
  /** Moving downward (landing on things). */
  readonly falling: boolean;
  /** Fires the player upward at `speed` px/s and refunds the air jump. */
  launch(speed: number): void;
  /** Upward acceleration for this step (updrafts). */
  addLift(acceleration: number): void;
  /** Moves the player with whatever they're standing on. */
  carry(dx: number, dy: number): void;
  /** Restores health; returns false if already full. */
  heal(amount: number): boolean;
}

/** Anything an updraft can lift. */
export interface Liftable {
  hurtbox(): Rect;
  applyLift(acceleration: number, dt: number): void;
}

export interface PropContext extends EnemyContext {
  player: PropPlayer;
  /** Adds an entity (dropped item, debris) to the stage after this step. */
  spawnEntity(entity: StageEntity): void;
  /** Enemies whose bodies overlap an area (fans lift them). */
  liftablesIn(area: Rect): Liftable[];
  /** A collectible gem was picked up. */
  gemCollected(x: number, y: number): void;
  /** The player stepped into a secret area (`firstVisit` only once per area). */
  secretEntered(region: CellRegion, firstVisit: boolean): void;
  /** The player left the secret area they were in. */
  secretLeft(): void;
  /** Makes a physics object solid to the player from above (moving platforms). */
  collidePlayerWith(object: Phaser.GameObjects.GameObject): void;
}
