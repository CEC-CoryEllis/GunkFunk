/**
 * "Crash-Test Rat" training dummy. Soaks up hits with exaggerated wobbles,
 * gets gummed up by snot, and when knocked out its head pops off and flies —
 * a launched object that bowls over any other dummy it hits. Then the spring
 * boings a fresh dummy back up.
 */
import * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { DUMMY_SHEET_KEY } from "../../art/sprites/dummy/dummy-sheet";
import { PROJECTILE_SHEET_KEY } from "../../art/sprites/weapons/projectile-sheet";
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
  rectAround,
} from "../combat/hit-types";
import type { StageContext, StageEntity } from "../stage/stage-context";
import { type ProjectileBody, stepProjectile } from "../weapons/projectile-motion";

const MAX_HEALTH = 8;
const RESPAWN_SECONDS = 2.6;
const SLIME_SECONDS = 2;
const HIT_POINTS = 10;
const KO_POINTS = 100;
const HEAD_MOTION = { gravity: 900, bounciness: 0.55, friction: 0.8 };

type DummyState = "idle" | "hit" | "broken" | "rising";

interface FlyingHead {
  sprite: Phaser.GameObjects.Sprite;
  body: ProjectileBody;
  age: number;
  key: string;
}

let headSerial = 0;

export class TrainingDummy implements Damageable, StageEntity {
  readonly team = "neutral" as const;
  readonly sprite: Phaser.GameObjects.Sprite;
  health = MAX_HEALTH;
  private state: DummyState = "idle";
  private timer = 0;
  private slimed = 0;
  private head?: FlyingHead;

  constructor(
    private readonly ctx: StageContext,
    readonly x: number,
    readonly y: number,
  ) {
    this.sprite = ctx.scene.add.sprite(x, y, DUMMY_SHEET_KEY).setDepth(15);
    applySheetOrigin(this.sprite, DUMMY_SHEET_KEY);
    this.play("idle");
    ctx.combat.register(this);
  }

  get targetable(): boolean {
    return this.state === "idle" || this.state === "hit";
  }

  get knockedOut(): boolean {
    return this.state === "broken" || this.state === "rising";
  }

  hurtbox(): Rect {
    // Body plus head: the hard hat tops out around 44 px above the base.
    return { x: this.x - 9, y: this.y - 46, width: 18, height: 42 };
  }

  takeHit(hit: HitInfo): HitResult {
    if (!this.targetable) return MISSED;
    this.health -= hit.damage;
    if (hit.status === "slimed") this.slimed = SLIME_SECONDS;
    const lean = knockbackFor(hit, this.x);
    this.sprite.setFlipX(lean < 0); // wobble away from the hit
    this.flash();
    if (this.health <= 0) {
      this.knockOut(hit, lean);
      this.ctx.addScore(KO_POINTS, this.x, this.y - 44);
      return { applied: true, defeated: true };
    }
    this.state = "hit";
    this.timer = 0.4;
    this.play("hit", true);
    this.ctx.addScore(HIT_POINTS, this.x, this.y - 44);
    return { applied: true, defeated: false };
  }

  fixedUpdate(dt: number): boolean {
    this.slimed = Math.max(0, this.slimed - dt);
    this.timer -= dt;
    this.updateHead(dt);
    switch (this.state) {
      case "hit":
        if (this.timer <= 0) this.state = "idle";
        break;
      case "broken":
        if (this.timer <= 0) this.rise();
        break;
      case "rising":
        if (this.timer <= 0) this.state = "idle";
        break;
      case "idle":
        break;
    }
    if (this.state === "idle") this.play(this.slimed > 0 ? "slimed" : "idle");
    this.sprite.setTint(this.slimed > 0 ? 0xb8ff9a : 0xffffff);
    return true;
  }

  private knockOut(hit: HitInfo, knockbackX: number): void {
    this.state = "broken";
    this.timer = RESPAWN_SECONDS;
    this.play("broken", true);
    this.ctx.fx.particles("stuffing", this.x, this.y - 22, 14);
    audio.sfx.play("enemy_pop");
    // A flat, fast arc so the head can bowl over the next dummy in line.
    this.launchHead(knockbackX || hit.knockbackX, -100 - Math.abs(hit.knockbackY) * 0.25);
  }

  private launchHead(vx: number, vy: number): void {
    this.head?.sprite.destroy();
    const sprite = this.ctx.scene.add
      .sprite(this.x, this.y - 38, PROJECTILE_SHEET_KEY)
      .setDepth(26);
    applySheetOrigin(sprite, PROJECTILE_SHEET_KEY);
    sprite.play(animationKey(PROJECTILE_SHEET_KEY, "dummy_head"));
    this.head = {
      sprite,
      age: 0,
      key: `dummy-head-${++headSerial}`,
      body: { x: this.x, y: this.y - 38, vx: vx * 1.2, vy, radius: 5, bouncesLeft: 4 },
    };
  }

  /** The flying head is a launched object: it bowls over other dummies it hits. */
  private updateHead(dt: number): void {
    const head = this.head;
    if (!head) return;
    head.age += dt;
    const solidAt = (x: number, y: number) => this.ctx.level.terrainAtWorld(x, y) === "solid";
    const events = stepProjectile(head.body, HEAD_MOTION, dt, solidAt);
    if (events.includes("bounce")) audio.sfx.play("ball_bounce", { pitch: 1.6, volume: 0.5 });
    head.sprite.setPosition(Math.round(head.body.x), Math.round(head.body.y));
    head.sprite.rotation += head.body.vx * dt * 0.08;
    if (Math.abs(head.body.vx) > 60) {
      const hit: HitInfo = {
        key: head.key,
        team: "player",
        kind: "launched",
        damage: 3,
        knockbackX: Math.sign(head.body.vx) * 200,
        knockbackY: -200,
        x: head.body.x,
        y: head.body.y,
        impact: 0.7,
      };
      for (const o of this.ctx.combat.strike(rectAround(head.body.x, head.body.y, 6), hit)) {
        if (o.target !== this) presentHit(this.ctx.fx, hit, o.result);
      }
    }
    const fading = head.age > 1.6;
    head.sprite.setAlpha(fading ? Math.max(0, 1 - (head.age - 1.6) * 3) : 1);
    if (head.age > 2 || events.includes("blocked")) {
      head.sprite.destroy();
      this.head = undefined;
    }
  }

  private rise(): void {
    this.state = "rising";
    this.timer = 0.35;
    this.health = MAX_HEALTH;
    this.sprite.setFlipX(false);
    this.play("rise", true);
    audio.sfx.play("toilet_launch", { pitch: 1.4, volume: 0.5 });
  }

  private flash(): void {
    this.sprite.setTintFill(0xffffff);
    this.ctx.scene.time.delayedCall(50, () => this.sprite.clearTint());
  }

  private play(name: string, restart = false): void {
    const key = animationKey(DUMMY_SHEET_KEY, name);
    if (!restart && this.sprite.anims.currentAnim?.key === key) return;
    this.sprite.play(key);
  }
}
