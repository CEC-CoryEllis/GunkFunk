/**
 * A weapon floating in a soap bubble. Touch it to take it: a new weapon, an
 * upgrade if you already carry it, or ammo once it's maxed out.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { PICKUP_SHEET_KEY } from "../../art/sprites/weapons/pickup-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import { type Rect, overlaps, rectAround } from "../combat/hit-types";
import type { StageContext, StageEntity } from "../stage/stage-context";
import type { WeaponId } from "../weapons/weapon-ids";

export interface PickupCollector {
  bodyRect(): Rect;
  /** Returns true if the item was taken. */
  collectWeapon(id: WeaponId): boolean;
}

export class WeaponPickup implements StageEntity {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private age = Math.random() * 3;
  private collected = false;

  constructor(
    private readonly ctx: StageContext,
    private readonly collector: PickupCollector,
    readonly weapon: WeaponId,
    private readonly x: number,
    private readonly y: number,
  ) {
    this.sprite = ctx.scene.add.sprite(x, y, PICKUP_SHEET_KEY).setDepth(18);
    applySheetOrigin(this.sprite, PICKUP_SHEET_KEY);
    this.sprite.play(animationKey(PICKUP_SHEET_KEY, weapon));
  }

  fixedUpdate(dt: number): boolean {
    if (this.collected) return false;
    this.age += dt;
    const bob = Math.round(Math.sin(this.age * 3) * 2);
    this.sprite.setPosition(this.x, this.y + bob);
    if (overlaps(rectAround(this.x, this.y + bob, 9), this.collector.bodyRect())) {
      if (this.collector.collectWeapon(this.weapon)) {
        this.collected = true;
        this.ctx.fx.burst(this.x, this.y);
        this.ctx.fx.particles("spark", this.x, this.y, 8);
        this.ctx.addScore(50, this.x, this.y - 14);
        this.sprite.destroy();
        return false;
      }
    }
    return true;
  }
}
