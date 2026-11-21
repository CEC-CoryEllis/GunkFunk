/**
 * Base for props that take hits and break: crates, toxic barrels, trash cans
 * and vending machines. They're on the "neutral" team, so the player, enemies
 * and the environment (explosions) can all smash them — chain reactions come
 * free from the shared damage pipeline.
 */
import type * as Phaser from "phaser";
import {
  type Damageable,
  type HitInfo,
  type HitResult,
  MISSED,
  type Rect,
} from "../combat/hit-types";
import type { StageEntity } from "../stage/stage-context";
import type { PropContext } from "./prop-context";
import { addPropSprite, flashWhite, playIfChanged, wobble } from "./prop-sprite";

export interface BreakableSpec {
  sheet: string;
  animation: string;
  /** Hurtbox size, standing on (x, y). */
  width: number;
  height: number;
  health: number;
  /** Awarded when it breaks. */
  points: number;
}

export abstract class BreakableProp implements Damageable, StageEntity {
  readonly team = "neutral" as const;
  readonly sprite: Phaser.GameObjects.Sprite;
  health: number;
  /** Broken props stop taking hits but may linger (fuses, wreckage). */
  protected broken = false;
  /** Set to true when the prop should be removed from the stage. */
  protected finished = false;

  constructor(
    protected readonly ctx: PropContext,
    protected readonly spec: BreakableSpec,
    readonly x: number,
    readonly y: number,
  ) {
    this.health = spec.health;
    this.sprite = addPropSprite(ctx.scene, spec.sheet, x, y, spec.animation);
    ctx.combat.register(this);
  }

  get targetable(): boolean {
    return !this.broken;
  }

  get isBroken(): boolean {
    return this.broken;
  }

  hurtbox(): Rect {
    const { width, height } = this.spec;
    return { x: this.x - width / 2, y: this.y - height, width, height };
  }

  takeHit(hit: HitInfo): HitResult {
    if (!this.targetable || hit.damage <= 0) return MISSED;
    this.health -= hit.damage;
    flashWhite(this.ctx.scene, this.sprite);
    if (this.health > 0) {
      wobble(this.ctx.scene, this.sprite);
      this.onDamaged(hit);
      return { applied: true, defeated: false };
    }
    this.broken = true;
    this.ctx.combat.unregister(this);
    if (this.spec.points > 0)
      this.ctx.addScore(this.spec.points, this.x, this.y - this.spec.height - 8);
    this.onBreak(hit);
    return { applied: true, defeated: true };
  }

  fixedUpdate(dt: number): boolean {
    this.step(dt);
    if (this.finished) {
      this.ctx.combat.unregister(this);
      this.sprite.destroy();
      return false;
    }
    return true;
  }

  /** Per-step behaviour (fuses, wreckage timers). */
  protected step(_dt: number): void {}

  /** Non-lethal hit reaction. */
  protected onDamaged(_hit: HitInfo): void {}

  /** Health ran out. Set `finished` when the prop should disappear. */
  protected abstract onBreak(hit: HitInfo): void;

  protected play(animation: string): void {
    playIfChanged(this.sprite, this.spec.sheet, animation);
  }

  /** Vertical centre of the hurtbox, for effects. */
  protected get midY(): number {
    return this.y - this.spec.height / 2;
  }
}
