/**
 * Shared enemy behaviour. Subclasses implement `think()` (their AI) and may
 * override the hit-reaction hooks; everything else lives here:
 *
 *   active   → AI runs, touching the player hurts
 *   stunned  → recoiling from a hit, sliding to a stop
 *   tumbling → launched by a big hit or a knockout: spins through the air
 *              and bowls over any other enemy it hits
 *   gone     → popped (knocked out) or fallen out of the world
 *
 * Hazards hurt enemies too, so knocking one into sludge is a valid tactic.
 */
import * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import { audio } from "../../audio";
import { presentHit } from "../combat/hit-feedback";
import {
  type Damageable,
  type HitInfo,
  type HitResult,
  MISSED,
  type Rect,
  knockbackFor,
  overlaps,
} from "../combat/hit-types";
import type { Liftable } from "../props/prop-context";
import type { StageEntity } from "../stage/stage-context";
import type { EnemyContext, EnemyHandle, EnemyStats } from "./enemy-context";
import type { EnemyKind } from "./enemy-kinds";

const STUN_SECONDS = 0.35;
const SLIME_SECONDS = 2.5;
const SLIMED_SPEED = 0.35;
/** Hits at or above this impact launch the enemy even if it survives. */
const LAUNCH_IMPACT = 0.8;
const TUMBLE_MIN_SECONDS = 0.18;
const TUMBLE_MAX_SECONDS = 1.1;
const BOWLING_DAMAGE = 2;
const FALL_FRICTION = 6;
/** Updrafts can't push an enemy up faster than this. */
const MAX_LIFT_SPEED = 280;
/** Fraction of vertical speed bled off per second in an updraft (see MovementController). */
const LIFT_DRAG = 4;
/** Hurtboxes reach this far above the physics body: short enemies stay hittable. */
const HURTBOX_HEADROOM = 6;

export type EnemyState = "active" | "stunned" | "tumbling";

/** How an enemy responds to a hit before damage is applied. */
export type HitReaction = "normal" | "blocked" | "absorbed";

let enemySerial = 0;

export abstract class Enemy implements Damageable, StageEntity, EnemyHandle, Liftable {
  readonly team = "enemy" as const;
  readonly kind: EnemyKind;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly id = ++enemySerial;
  health: number;
  facing: 1 | -1 = -1;
  state: EnemyState = "active";
  protected stateTime = 0;
  protected slimeTimer = 0;
  private stunTimer = 0;
  private tumbleTimer = 0;
  private flashTimer = 0;
  private dying = false;
  private removed = false;
  private hitSerial = 0;
  private readonly collider: Phaser.Physics.Arcade.Collider;

  protected constructor(
    protected readonly ctx: EnemyContext,
    protected readonly stats: EnemyStats,
    x: number,
    y: number,
  ) {
    this.kind = stats.kind;
    this.health = stats.maxHealth;
    this.sprite = ctx.scene.physics.add.sprite(x, y, stats.sheetKey, 0).setDepth(16);
    applySheetOrigin(this.sprite, stats.sheetKey);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(stats.body.w, stats.body.h, false);
    const origin = { x: this.sprite.displayOriginX, y: this.sprite.displayOriginY };
    this.body.setOffset(origin.x - stats.body.w / 2, origin.y - stats.body.h);
    this.body.setAllowGravity(stats.gravity > 0);
    this.body.setGravityY(stats.gravity);
    this.body.setMaxVelocity(600, 700);
    this.collider = ctx.scene.physics.add.collider(
      this.sprite,
      ctx.level.layer,
      undefined,
      (_s, tile) => ctx.level.allowsTileCollision(this.body, tile as Phaser.Tilemaps.Tile),
    );
    ctx.combat.register(this);
    this.facing = ctx.player.x < x ? -1 : 1;
  }

  // ── Damageable ────────────────────────────────────────────────────────────
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get targetable(): boolean {
    return !this.removed && this.state !== "tumbling";
  }
  get slimed(): boolean {
    return this.slimeTimer > 0;
  }
  /** Multiplier for any movement speed the AI chooses (slime gums enemies up). */
  protected get speedScale(): number {
    return this.slimed ? SLIMED_SPEED : 1;
  }

  hurtbox(): Rect {
    return {
      x: this.body.left,
      y: this.body.top - HURTBOX_HEADROOM,
      width: this.body.width,
      height: this.body.height + HURTBOX_HEADROOM,
    };
  }

  takeHit(hit: HitInfo): HitResult {
    if (!this.targetable) return MISSED;
    const reaction = this.reactToHit(hit);
    if (reaction !== "normal") return MISSED;
    this.health -= hit.damage;
    if (hit.status === "slimed") this.slimeTimer = SLIME_SECONDS;
    const kx = knockbackFor(hit, this.x) / this.stats.weight;
    const ky = hit.knockbackY / this.stats.weight;
    this.flash();
    audio.sfx.play(this.stats.hurtSfx, { volume: 0.8 });
    if (this.health <= 0) {
      this.knockOut(kx, ky);
      return { applied: true, defeated: true };
    }
    if (this.onDamaged(hit)) return { applied: true, defeated: false };
    if (hit.impact >= LAUNCH_IMPACT || hit.kind === "explosion") this.tumble(kx, ky);
    else this.stun(kx, Math.min(ky, -60));
    return { applied: true, defeated: false };
  }

  /** Updrafts carry enemies up helplessly (vent fans). */
  applyLift(acceleration: number, dt: number): void {
    if (this.removed) return;
    // Arcade adds the body's own gravity during its step; only the lift goes here.
    let vy = this.body.velocity.y - acceleration * dt;
    vy -= vy * LIFT_DRAG * dt;
    this.body.setVelocityY(Math.max(vy, -MAX_LIFT_SPEED));
  }

  // ── Hooks for subclasses ──────────────────────────────────────────────────
  /** The enemy's AI, run every step while active. */
  protected abstract think(dt: number): void;

  /** Armour, absorption etc. Return "blocked"/"absorbed" to cancel the hit. */
  protected reactToHit(_hit: HitInfo): HitReaction {
    return "normal";
  }

  /** Called after non-lethal damage. Return true if the subclass handled the reaction itself. */
  protected onDamaged(_hit: HitInfo): boolean {
    return false;
  }

  /** Whether touching the enemy right now hurts (e.g. not while it lies on its face). */
  protected get contactActive(): boolean {
    return true;
  }

  /** Animation to show while stunned / tumbling. */
  protected hurtAnimation(): string {
    return "hurt";
  }

  // ── Per-step update ───────────────────────────────────────────────────────
  fixedUpdate(dt: number): boolean {
    if (this.removed) return false;
    this.stateTime += dt;
    this.slimeTimer = Math.max(0, this.slimeTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.flashTimer > 0) this.sprite.setTintFill(0xffffff);
    else this.sprite.setTint(this.slimed ? 0xb8ff9a : 0xffffff);
    if (this.checkHazards() || this.y > this.ctx.level.heightPx + 48) {
      if (!this.removed) this.remove();
      return false;
    }
    switch (this.state) {
      case "tumbling":
        this.updateTumble(dt);
        break;
      case "stunned":
        this.stunTimer -= dt;
        this.body.setVelocityX(this.body.velocity.x * Math.max(0, 1 - FALL_FRICTION * dt));
        if (this.stunTimer <= 0) this.setState("active");
        break;
      case "active":
        this.think(dt);
        this.touchPlayer();
        break;
    }
    this.sprite.setFlipX(this.facing < 0);
    return !this.removed;
  }

  // ── Shared behaviours ─────────────────────────────────────────────────────
  protected setState(state: EnemyState): void {
    this.state = state;
    this.stateTime = 0;
    if (state !== "tumbling") this.sprite.setRotation(0);
  }

  protected play(name: string, restart = false): void {
    const key = animationKey(this.stats.sheetKey, name);
    if (!restart && this.sprite.anims.currentAnim?.key === key) return;
    this.sprite.play(key);
  }

  /** Horizontal distance to the player (positive = player to the right). */
  protected dxToPlayer(): number {
    return this.ctx.player.x - this.x;
  }

  protected dyToPlayer(): number {
    return this.ctx.player.y - this.y;
  }

  protected playerWithin(rangeX: number, rangeY: number): boolean {
    return (
      this.ctx.player.targetable &&
      Math.abs(this.dxToPlayer()) <= rangeX &&
      Math.abs(this.dyToPlayer()) <= rangeY
    );
  }

  protected facePlayer(): void {
    this.facing = this.dxToPlayer() < 0 ? -1 : 1;
  }

  protected get onGround(): boolean {
    return this.body.blocked.down;
  }

  /** True if walking forward would hit a wall or step off a ledge. */
  protected blockedAhead(): boolean {
    const level = this.ctx.level;
    const aheadX = this.facing > 0 ? this.body.right + 2 : this.body.left - 2;
    const wall = level.terrainAtWorld(aheadX, this.body.bottom - 4) === "solid";
    const floorKind = level.terrainAtWorld(aheadX, this.body.bottom + 4);
    const ledge = floorKind === "empty" || floorKind === "sludge" || floorKind === "spikes";
    return wall || (this.onGround && ledge);
  }

  /** Strikes the player (and anything else not on the enemy team) in an area. */
  protected strike(area: Rect, damage: number, knockbackX: number, knockbackY: number): boolean {
    const hit: HitInfo = {
      key: `enemy-${this.id}-${++this.hitSerial}`,
      team: "enemy",
      kind: "melee",
      damage,
      knockbackX,
      knockbackY,
      x: area.x + area.width / 2,
      y: area.y + area.height / 2,
      impact: 0.3,
    };
    return this.ctx.combat.strike(area, hit).some((o) => o.result.applied);
  }

  private touchPlayer(): void {
    if (this.stats.contactDamage <= 0 || !this.contactActive || !this.ctx.player.targetable) return;
    if (!overlaps(this.hurtbox(), this.ctx.player.hurtbox())) return;
    this.strike(
      this.hurtbox(),
      this.stats.contactDamage,
      Math.sign(this.dxToPlayer() || 1) * 150,
      -180,
    );
  }

  private stun(vx: number, vy: number): void {
    this.setState("stunned");
    this.stunTimer = STUN_SECONDS;
    this.body.setVelocity(vx, vy);
    this.play(this.hurtAnimation(), true);
  }

  private tumble(vx: number, vy: number): void {
    this.setState("tumbling");
    this.tumbleTimer = 0;
    this.body.setAllowGravity(true);
    if (this.body.gravity.y === 0) this.body.setGravityY(900);
    this.body.setVelocity(vx === 0 ? this.facing * -180 : vx * 1.3, Math.min(vy * 1.2, -220));
    this.play(this.hurtAnimation(), true);
  }

  private knockOut(vx: number, vy: number): void {
    this.dying = true;
    this.tumble(Math.sign(vx || 1) * Math.max(Math.abs(vx), 220), vy);
  }

  /** Launched enemies spin, bowl over other enemies, and either recover or pop when they land. */
  private updateTumble(dt: number): void {
    this.tumbleTimer += dt;
    this.sprite.rotation += this.body.velocity.x * dt * 0.04;
    const speed = Math.hypot(this.body.velocity.x, this.body.velocity.y);
    if (speed > 80) {
      const hit: HitInfo = {
        key: `tumble-${this.id}-${this.hitSerial}`,
        team: "player",
        kind: "launched",
        damage: BOWLING_DAMAGE,
        knockbackX: Math.sign(this.body.velocity.x) * 220,
        knockbackY: -200,
        x: this.x,
        y: this.y - this.stats.body.h / 2,
        impact: 0.7,
      };
      for (const o of this.ctx.combat.strike(this.hurtbox(), hit))
        presentHit(this.ctx.fx, hit, o.result);
    }
    const landed = this.tumbleTimer > TUMBLE_MIN_SECONDS && this.onGround;
    if (!landed && this.tumbleTimer < TUMBLE_MAX_SECONDS) return;
    if (this.dying) {
      this.pop();
    } else {
      this.hitSerial++;
      this.body.setAllowGravity(this.stats.gravity > 0);
      this.body.setGravityY(this.stats.gravity);
      this.stun(0, 0);
    }
  }

  /** Knocked out: burst, score, gone. */
  private pop(): void {
    const { fx } = this.ctx;
    const cy = this.y - this.stats.body.h / 2;
    fx.burst(this.x, cy);
    fx.particles("spark", this.x, cy, 8);
    fx.word(
      this.stats.words[Math.floor(Math.random() * this.stats.words.length)]!,
      this.x,
      cy - 12,
      "pink",
    );
    audio.sfx.play("enemy_pop");
    this.ctx.enemyDefeated(this, this.stats.points);
    this.remove();
  }

  /** Returns true if a hazard finished this enemy off. */
  private checkHazards(): boolean {
    const feet = {
      x: this.body.left + 2,
      y: this.body.bottom - 4,
      width: this.body.width - 4,
      height: 4,
    };
    const hazard = this.ctx.level.hazardAt(feet);
    if (!hazard || (hazard === "sludge" && this.stats.sludgeImmune)) return false;
    this.ctx.fx.splat(this.x, this.body.bottom - 2);
    this.ctx.fx.word(hazard === "sludge" ? "SIZZLE!" : "OUCH!", this.x, this.y - 30, "slime");
    audio.sfx.play("sludge_splash");
    this.ctx.enemyDefeated(this, this.stats.points);
    return true;
  }

  private flash(): void {
    this.flashTimer = 0.06;
    this.sprite.setTintFill(0xffffff);
  }

  /** Removes the enemy without scoring (used for splits and despawns). */
  remove(): void {
    if (this.removed) return;
    this.removed = true;
    this.ctx.combat.unregister(this);
    this.collider.destroy();
    this.sprite.destroy();
  }

  get gone(): boolean {
    return this.removed;
  }
}
