/**
 * THE CLOG, World 1's mini-boss. Asleep until its arena locks, then it follows
 * `ClogBrain`: rolls at Bulgo and bonks the wall (shaking hairballs loose from
 * the ceiling), spits hairballs, and once enraged coughs up rats. Its matted
 * hair soaks up a point of every hit unless it's stunned — so dodge the roll,
 * then pile in while it's seeing stars.
 */
import * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { CLOG_SHEET_KEY } from "../../art/sprites/bosses/clog-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import { audio } from "../../audio";
import { presentHit } from "../combat/hit-feedback";
import { type HitInfo, type HitResult, MISSED, type Rect, overlaps } from "../combat/hit-types";
import { dropItem } from "../props/item-pickup";
import type { PropContext } from "../props/prop-context";
import { PROJECTILES } from "../weapons/projectile-definitions";
import { lobVelocity } from "../weapons/projectile-motion";
import type { Boss } from "./boss";
import { ClogBrain, type ClogCue } from "./clog-brain";

export const CLOG_MAX_HEALTH = 24;
const BODY = { w: 50, h: 42 };
const GRAVITY = 900;
/** Damage the hair soaks up from every hit while the Clog isn't stunned. */
export const HAIR_ARMOUR = 1;
const DEFEAT_SECONDS = 1.8;
const DEFEAT_POINTS = 5000;
const DEBRIS_HAIRBALLS = 3;
const RATS_PER_COUGH = 2;

let clogHitSerial = 0;

export class TheClog implements Boss {
  readonly team = "enemy" as const;
  readonly name = "THE CLOG";
  readonly maxHealth = CLOG_MAX_HEALTH;
  health = CLOG_MAX_HEALTH;
  readonly brain = new ClogBrain();
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;
  private facing: 1 | -1 = -1;
  private rollDirection: 1 | -1 = -1;
  private defeatTimer = -1;
  private finished = false;
  private flashTimer = 0;
  private contactKey = "";

  constructor(
    private readonly ctx: PropContext,
    private readonly home: { x: number; y: number },
    /** The arena between its gates, floor to ceiling (debris falls from its top). */
    private readonly arena: Rect,
  ) {
    this.sprite = ctx.scene.physics.add.sprite(home.x, home.y, CLOG_SHEET_KEY).setDepth(17);
    applySheetOrigin(this.sprite, CLOG_SHEET_KEY);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(BODY.w, BODY.h, false);
    this.body.setOffset(
      this.sprite.displayOriginX - BODY.w / 2,
      this.sprite.displayOriginY - BODY.h,
    );
    this.body.setGravityY(GRAVITY).setMaxVelocity(400, 700);
    ctx.scene.physics.add.collider(this.sprite, ctx.level.layer, undefined, (_s, tile) =>
      ctx.level.allowsTileCollision(this.body, tile as Phaser.Tilemaps.Tile),
    );
    ctx.combat.register(this);
    this.play("sleep");
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  get defeated(): boolean {
    return this.health <= 0;
  }

  /** The defeat sequence has finished and the Clog is gone. */
  get gone(): boolean {
    return this.finished;
  }

  get targetable(): boolean {
    return this.brain.action !== "dormant" && !this.defeated;
  }

  hurtbox(): Rect {
    return {
      x: this.body.left,
      y: this.body.top - 4,
      width: this.body.width,
      height: this.body.height + 4,
    };
  }

  engage(): void {
    this.act(this.brain.wake());
  }

  reset(): void {
    if (this.finished) return;
    this.health = CLOG_MAX_HEALTH;
    this.brain.reset();
    this.body.reset(this.home.x, this.home.y);
    this.sprite.setVisible(true).clearTint().setAngle(0);
    this.play("sleep");
  }

  takeHit(hit: HitInfo): HitResult {
    if (!this.targetable) return MISSED;
    const damage = this.brain.exposed ? hit.damage : hit.damage - HAIR_ARMOUR;
    if (damage <= 0) {
      audio.sfx.play("enemy_hit", { pitch: 0.6, volume: 0.6 });
      this.ctx.fx.word("FWUMP!", hit.x, hit.y - 10, "white");
      return MISSED;
    }
    this.health = Math.max(0, this.health - damage);
    this.flashTimer = 0.07;
    audio.sfx.play("boss_hit");
    if (this.health > 0) return { applied: true, defeated: false };
    this.beginDefeat();
    return { applied: true, defeated: true };
  }

  fixedUpdate(dt: number): boolean {
    if (this.finished) return false;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.flashTimer > 0) this.sprite.setTintFill(0xffffff);
    else this.sprite.clearTint();
    if (this.defeatTimer >= 0) {
      this.updateDefeat(dt);
      return !this.finished;
    }
    const bumped =
      this.brain.action === "roll" &&
      ((this.rollDirection < 0 && this.body.blocked.left) ||
        (this.rollDirection > 0 && this.body.blocked.right));
    this.act(this.brain.update(dt, this.health / this.maxHealth, bumped));
    this.move(dt);
    this.touchPlayer();
    this.sprite.setFlipX(this.facing < 0);
    return true;
  }

  private act(cues: readonly ClogCue[]): void {
    const { fx } = this.ctx;
    for (const cue of cues) {
      switch (cue) {
        case "roar":
          audio.sfx.play("boss_roar");
          fx.shake(0.7, 400);
          fx.word("BLORRRP!", this.x, this.y - 64, "pink");
          break;
        case "rollStart":
          this.rollDirection = this.ctx.player.x < this.x ? -1 : 1;
          this.facing = this.rollDirection;
          this.contactKey = `clog-roll-${++clogHitSerial}`;
          audio.sfx.play("ball_bounce", { pitch: 0.4 });
          break;
        case "rebound":
          this.rollDirection = this.rollDirection > 0 ? -1 : 1;
          this.facing = this.rollDirection;
          this.contactKey = `clog-roll-${++clogHitSerial}`;
          audio.sfx.play("mech_stomp", { volume: 0.7 });
          fx.shake(0.5);
          break;
        case "bonk":
          this.bonk();
          break;
        case "spit":
          this.spit();
          break;
        case "cough":
          this.cough();
          break;
        case "enraged":
          audio.sfx.play("boss_roar", { pitch: 0.8 });
          fx.shake(0.8, 500);
          fx.word("GRRAAAGH!", this.x, this.y - 64, "pink");
          break;
      }
    }
  }

  private move(dt: number): void {
    const action = this.brain.action;
    if (action === "roll") {
      this.body.setVelocityX(this.rollDirection * this.brain.tuning.rollSpeed);
      this.play("roll");
      return;
    }
    // Everything else happens standing still (sliding to a stop after a bonk).
    this.body.setVelocityX(this.body.velocity.x * Math.max(0, 1 - 8 * dt));
    if (action === "idle" || action === "waking") {
      this.facing = this.ctx.player.x < this.x ? -1 : 1;
    }
    const anim: Record<string, string> = {
      dormant: "sleep",
      waking: "idle",
      idle: "idle",
      windup: "windup",
      stunned: "stunned",
      spit: "spit",
      cough: "spit",
    };
    this.play(anim[action] ?? "idle");
    if (action === "windup") this.sprite.x += Math.random() < 0.5 ? -1 : 1;
  }

  /** Rolled into the arena wall: the whole room shakes and hair rains down. */
  private bonk(): void {
    const { fx } = this.ctx;
    audio.sfx.play("mech_stomp");
    fx.shake(1, 300);
    fx.hitStop(80);
    fx.word("BONK!", this.x, this.y - 60, "gold");
    fx.dust(this.x + this.rollDirection * 26, this.y, this.rollDirection > 0);
    this.body.setVelocity(-this.rollDirection * 90, -160);
    for (let i = 0; i < DEBRIS_HAIRBALLS; i++) {
      const x = this.arena.x + 24 + Math.random() * (this.arena.width - 48);
      this.ctx.projectiles.fire({
        kind: "hairball",
        x,
        y: this.arena.y + 8,
        vx: 0,
        vy: 40,
        team: "enemy",
      });
    }
  }

  private spit(): void {
    const count = this.brain.tuning.spitCount;
    const mouth = { x: this.x + this.facing * 16, y: this.y - 22 };
    const target = this.ctx.player.hurtbox();
    const gravity = PROJECTILES.hairball.gravity;
    audio.sfx.play("snot_fire", { pitch: 0.6 });
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 28;
      const velocity = lobVelocity(
        target.x + target.width / 2 + spread - mouth.x,
        target.y + target.height - mouth.y,
        gravity,
        55 + i * 3,
      ) ?? { vx: this.facing * (120 + i * 30), vy: -260 };
      this.ctx.projectiles.fire({ kind: "hairball", ...mouth, ...velocity, team: "enemy" });
    }
  }

  private cough(): void {
    audio.sfx.play("burp", { pitch: 0.5 });
    this.ctx.fx.word("HACK!", this.x, this.y - 60, "white");
    for (let i = 0; i < RATS_PER_COUGH; i++) {
      this.ctx.spawnEnemy("rat", this.x + this.facing * (20 + i * 14), this.y);
    }
  }

  private touchPlayer(): void {
    const player = this.ctx.player;
    if (!this.brain.dangerous || !player.targetable) return;
    if (!overlaps(this.hurtbox(), player.hurtbox())) return;
    const rolling = this.brain.action === "roll";
    const hit: HitInfo = {
      key: rolling
        ? this.contactKey
        : `clog-touch-${Math.floor(this.brain.time * 2)}-${this.brain.action}`,
      team: "enemy",
      kind: "melee",
      damage: rolling ? 2 : 1,
      knockbackX: (player.x < this.x ? -1 : 1) * 240,
      knockbackY: -260,
      x: player.x,
      y: player.y - 16,
      impact: rolling ? 0.8 : 0.4,
    };
    for (const outcome of this.ctx.combat.strike(this.hurtbox(), hit)) {
      presentHit(this.ctx.fx, hit, outcome.result, ["SQUISH!", "FLATTENED!"]);
    }
  }

  private beginDefeat(): void {
    this.brain.defeat();
    this.defeatTimer = 0;
    this.body.setVelocity(0, 0);
    this.play("stunned");
    audio.sfx.play("boss_explode");
    this.ctx.fx.hitStop(160);
    this.ctx.fx.word("FLUSHED!", this.x, this.y - 70, "gold");
  }

  /** Bursts of hair and junk, then it's gone and the loot falls out. */
  private updateDefeat(dt: number): void {
    const before = this.defeatTimer;
    this.defeatTimer += dt;
    const { fx } = this.ctx;
    if (Math.floor(this.defeatTimer * 6) !== Math.floor(before * 6)) {
      const ox = Phaser.Math.Between(-24, 24);
      const oy = Phaser.Math.Between(-40, -6);
      fx.burst(this.x + ox, this.y + oy);
      fx.particles("splinter", this.x + ox, this.y + oy, 10);
      fx.particles("junk", this.x + ox, this.y + oy, 4);
      fx.shake(0.6);
      audio.sfx.play("enemy_pop", { pitch: 0.6 + Math.random() * 0.4 });
    }
    this.sprite.setScale(1 - this.defeatTimer * 0.15, 1 - this.defeatTimer * 0.2);
    if (this.defeatTimer < DEFEAT_SECONDS) return;
    audio.sfx.play("boss_explode", { pitch: 1.3 });
    fx.shake(1, 400);
    fx.particles("stuffing", this.x, this.y - 24, 30);
    this.ctx.addScore(DEFEAT_POINTS, this.x, this.y - 50);
    dropItem(this.ctx, "feast", this.x, this.y - 20, -60);
    dropItem(this.ctx, "snack", this.x, this.y - 24, 40);
    dropItem(this.ctx, "snack", this.x, this.y - 20, 110);
    this.ctx.combat.unregister(this);
    this.sprite.destroy();
    this.finished = true;
  }

  private play(name: string): void {
    const key = animationKey(CLOG_SHEET_KEY, name);
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
  }
}
