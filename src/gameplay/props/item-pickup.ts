/**
 * Food and gems. Items placed in the map float and bob; items knocked out of
 * crates, cans and vending machines pop out with real physics and bounce to a
 * stop. Snacks heal (or score if Bulgo is already stuffed), gems score big.
 */
import type * as Phaser from "phaser";
import { ITEM_SHEET_KEY } from "../../art/sprites/props/item-sheet";
import { audio } from "../../audio";
import { overlaps, rectAround } from "../combat/hit-types";
import type { StageEntity } from "../stage/stage-context";
import { type ProjectileBody, stepProjectile } from "../weapons/projectile-motion";
import type { PropContext } from "./prop-context";
import type { ItemKind } from "./prop-kinds";
import { addPropSprite } from "./prop-sprite";

const MOTION = { gravity: 700, bounciness: 0.4, friction: 0.6 };
/** Dropped items can't be grabbed straight away, so the pop is visible. */
const PICKUP_DELAY = 0.3;
/** Dropped food spoils (blinks, then vanishes); gems never do. */
const SPOIL_SECONDS = 12;
const FULL_BELLY_POINTS = 100;

const HEALING: Readonly<Record<ItemKind, number>> = { snack: 1, feast: 3, gem: 0 };

export class ItemPickup implements StageEntity {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly body: ProjectileBody;
  /** Map-placed items float in place; dropped ones fall and bounce. */
  private readonly floating: boolean;
  private age = 0;
  private collected = false;

  constructor(
    private readonly ctx: PropContext,
    readonly kind: ItemKind,
    x: number,
    y: number,
    /** Null for items placed in the map: they float in place. */
    velocity: { vx: number; vy: number } | null,
  ) {
    this.sprite = addPropSprite(ctx.scene, ITEM_SHEET_KEY, x, y, kind, 18);
    this.body = { x, y, vx: velocity?.vx ?? 0, vy: velocity?.vy ?? 0, radius: 7, bouncesLeft: 6 };
    this.floating = velocity === null;
    if (this.floating) this.age = PICKUP_DELAY + Math.random() * 3;
  }

  get x(): number {
    return this.body.x;
  }
  get y(): number {
    return this.body.y;
  }

  fixedUpdate(dt: number): boolean {
    if (this.collected) return false;
    this.age += dt;
    let drawY = this.body.y;
    if (this.floating) {
      drawY += Math.round(Math.sin(this.age * 3) * 2);
    } else {
      const solidAt = (x: number, y: number) => this.ctx.level.terrainAtWorld(x, y) === "solid";
      if (
        stepProjectile(this.body, MOTION, dt, solidAt).includes("bounce") &&
        Math.abs(this.body.vy) > 60
      ) {
        audio.sfx.play("ball_bounce", { pitch: 1.8, volume: 0.3 });
      }
    }
    this.sprite.setPosition(Math.round(this.body.x), Math.round(drawY));
    if (
      this.age >= PICKUP_DELAY &&
      overlaps(rectAround(this.body.x, drawY, 7), this.ctx.player.bodyRect())
    ) {
      this.collect();
      return false;
    }
    return this.updateSpoiling();
  }

  private updateSpoiling(): boolean {
    if (this.floating || this.kind === "gem") return true;
    const left = SPOIL_SECONDS - this.age;
    if (left <= 0) {
      this.sprite.destroy();
      return false;
    }
    this.sprite.setVisible(left > 3 || Math.floor(left * 8) % 2 === 0);
    return true;
  }

  private collect(): void {
    this.collected = true;
    const { x, y } = this.body;
    if (this.kind === "gem") {
      audio.sfx.play("gem");
      this.ctx.fx.particles("spark", x, y, 10);
      this.ctx.gemCollected(x, y);
    } else if (this.ctx.player.heal(HEALING[this.kind])) {
      audio.sfx.play("health_pickup");
      this.ctx.fx.word(this.kind === "feast" ? "BURP!" : "GULP!", x, y - 12, "white");
    } else {
      audio.sfx.play("coin");
      this.ctx.addScore(FULL_BELLY_POINTS, x, y - 12);
    }
    this.sprite.destroy();
  }
}

/** Pops an item out of something at (x, y) with a little upward hop. */
export function dropItem(ctx: PropContext, kind: ItemKind, x: number, y: number, vx = 0): void {
  const hop = { vx: vx + (Math.random() - 0.5) * 60, vy: -200 - Math.random() * 60 };
  ctx.spawnEntity(new ItemPickup(ctx, kind, x, y, hop));
}
