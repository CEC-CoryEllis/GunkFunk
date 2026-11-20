/**
 * A hazard-striped sewer platform that shuttles between two stops, pausing at
 * each end. Solid from above only. Arcade carries a rider sideways through
 * the immovable body's friction; going down, the platform pulls its rider
 * along itself so Bulgo doesn't hop off every step.
 */
import type * as Phaser from "phaser";
import { LARGE_PROP_SHEET_KEY } from "../../art/sprites/props/large-props-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { TILE_SIZE } from "../../config/display";
import type { StageEntity } from "../stage/stage-context";
import type { PlatformPath } from "./platform-path";
import type { PropContext } from "./prop-context";
import { PROP_DEPTH } from "./prop-sprite";

export const PLATFORM_SPEED = 48;
const END_PAUSE = 0.6;
/** Platforms are two tiles wide (`==` in the map). */
export const PLATFORM_WIDTH = 32;
/** The walkable top edge's row in the 32×48 frame; the sheet origin is row 47. */
const SURFACE_ROW = 38;
const ORIGIN_ROW = 47;
const BODY_HEIGHT = 8;

interface Point {
  x: number;
  y: number;
}

const tileCorner = ({ tx, ty }: { tx: number; ty: number }): Point => ({
  x: tx * TILE_SIZE,
  y: ty * TILE_SIZE,
});

export class MovingPlatform implements StageEntity {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;
  /** Both ends, as the body's top-left corner. */
  private readonly ends: [Point, Point];
  private target = 1;
  private pause = END_PAUSE;
  private lastTop: number;

  constructor(
    private readonly ctx: PropContext,
    path: PlatformPath,
  ) {
    this.ends = [tileCorner(path.from), tileCorner(path.to)];
    const start = this.ends[0];
    this.sprite = ctx.scene.physics.add
      .sprite(
        start.x + PLATFORM_WIDTH / 2,
        start.y + ORIGIN_ROW - SURFACE_ROW,
        LARGE_PROP_SHEET_KEY,
      )
      .setDepth(PROP_DEPTH);
    applySheetOrigin(this.sprite, LARGE_PROP_SHEET_KEY);
    this.sprite.play(animationKey(LARGE_PROP_SHEET_KEY, "platform"));
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(PLATFORM_WIDTH, BODY_HEIGHT).setOffset(0, SURFACE_ROW);
    this.body.setImmovable(true).setAllowGravity(false);
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
    // The body only syncs to the sprite on the next physics frame.
    this.lastTop = start.y;
    ctx.collidePlayerWith(this.sprite);
  }

  /** Top edge, in world pixels. */
  get top(): number {
    return this.body.top;
  }

  get moving(): boolean {
    return this.pause <= 0;
  }

  fixedUpdate(dt: number): boolean {
    this.carryRiderDown();
    this.lastTop = this.body.top;
    if (this.pause > 0) {
      this.pause -= dt;
      this.body.setVelocity(0, 0);
      return true;
    }
    const goal = this.ends[this.target]!;
    const dx = goal.x - this.body.x;
    const dy = goal.y - this.body.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.5) {
      this.target = 1 - this.target;
      this.pause = END_PAUSE;
      this.body.setVelocity(0, 0);
      return true;
    }
    // Never overshoot: the last step lands exactly on the stop.
    const speed = Math.min(PLATFORM_SPEED, distance / dt);
    this.body.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    return true;
  }

  /** Sinking platforms take their rider with them instead of dropping out from under them. */
  private carryRiderDown(): void {
    const dy = this.body.top - this.lastTop;
    if (dy <= 0) return;
    const player = this.ctx.player;
    if (!player.targetable) return;
    const feet = player.bodyRect();
    const bottom = feet.y + feet.height;
    const overlapsX = feet.x < this.body.right && feet.x + feet.width > this.body.left;
    if (overlapsX && Math.abs(bottom - this.lastTop) <= 2) player.carry(0, dy);
  }
}
