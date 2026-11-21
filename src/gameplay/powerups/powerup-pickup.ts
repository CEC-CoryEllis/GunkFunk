/**
 * A power-up spinning in a golden sunburst. Touch it to start the power-up
 * (or refresh one that's already running).
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { POWERUP_SHEET_KEY } from "../../art/sprites/powerups/powerup-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import { type Rect, overlaps, rectAround } from "../combat/hit-types";
import type { StageContext, StageEntity } from "../stage/stage-context";
import type { PowerUpId } from "./powerup-ids";

export interface PowerUpCollector {
  bodyRect(): Rect;
  /** Returns true if the power-up was taken. */
  collectPowerUp(id: PowerUpId): boolean;
}

export class PowerUpPickup implements StageEntity {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private age = Math.random() * 3;

  constructor(
    private readonly ctx: StageContext,
    private readonly collector: PowerUpCollector,
    readonly id: PowerUpId,
    readonly x: number,
    readonly y: number,
  ) {
    this.sprite = ctx.scene.add.sprite(x, y, POWERUP_SHEET_KEY).setDepth(18);
    applySheetOrigin(this.sprite, POWERUP_SHEET_KEY);
    this.sprite.play(animationKey(POWERUP_SHEET_KEY, id));
  }

  fixedUpdate(dt: number): boolean {
    this.age += dt;
    const bob = Math.round(Math.sin(this.age * 2.5) * 2);
    this.sprite.setPosition(this.x, this.y + bob);
    if (!overlaps(rectAround(this.x, this.y + bob, 10), this.collector.bodyRect())) return true;
    if (!this.collector.collectPowerUp(this.id)) return true;
    this.ctx.fx.burst(this.x, this.y);
    this.ctx.fx.particles("spark", this.x, this.y, 14);
    this.ctx.addScore(250, this.x, this.y - 16);
    this.sprite.destroy();
    return false;
  }
}
