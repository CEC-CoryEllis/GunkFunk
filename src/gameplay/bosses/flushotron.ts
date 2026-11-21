/**
 * PROFESSOR STINKBOTTOM in the FLUSH-O-TRON 3000 — World 1's final boss.
 * `FlushOTronBrain` decides; this body moves (walking, hovering, hopping),
 * attacks, takes hits through its armour, smashes the arena as it falls
 * apart, and plays the intro and defeat. Its parts are posed by `TronRig`.
 */
import * as Phaser from "phaser";
import { audio } from "../../audio";
import type { Cell } from "../../levels/cell-regions";
import { SpeechBubble } from "../../ui/speech-bubble";
import { showStageCard } from "../../ui/banners";
import { presentHit } from "../combat/hit-feedback";
import {
  type HitInfo,
  type HitResult,
  MISSED,
  type Rect,
  overlaps,
  rectAround,
} from "../combat/hit-types";
import type { PropContext } from "../props/prop-context";
import type { Boss } from "./boss";
import { Shockwaves, fireStraight, lob } from "./flushotron-attacks";
import { FlushOTronBrain, TRON_MAX_HEALTH, type TronCue } from "./flushotron-brain";
import { TronMotion } from "./flushotron-motion";
import { ARM_REACH, armLength, tronPose } from "./flushotron-pose";
import { HULL_HEIGHT, TronRig } from "./flushotron-rig";

/** Cells the fight wrecks: grates it smashes, floor it caves into sludge. */
export interface ArenaDamage {
  fragile: readonly Cell[];
  collapse: readonly Cell[];
}

/** Hits are dulled by this much unless the machine is exposed. */
export const TRON_ARMOUR = 1;
const DEFEAT_SECONDS = 3.4;
const DEFEAT_POINTS = 20000;
const VOICE_PITCH = 1.5;

let tronHitSerial = 0;

export class FlushOTron implements Boss {
  readonly team = "enemy" as const;
  readonly name = "FLUSH-O-TRON 3000";
  readonly music = "boss" as const;
  readonly endsStage = true;
  readonly maxHealth = TRON_MAX_HEALTH;
  health = TRON_MAX_HEALTH;
  readonly brain = new FlushOTronBrain();
  private readonly rig: TronRig;
  private readonly waves: Shockwaves;
  private readonly bubble: SpeechBubble;
  private readonly motion: TronMotion;
  private flashTimer = 0;
  private hurtTimer = 0;
  private defeatTimer = -1;
  private finished = false;
  private contactKey = "tron-touch";

  constructor(
    private readonly ctx: PropContext,
    home: { x: number; y: number },
    arena: Rect,
    private readonly wreckage: ArenaDamage,
  ) {
    this.motion = new TronMotion(home, arena);
    this.rig = new TronRig(ctx.scene);
    this.waves = new Shockwaves(ctx, home.y, arena);
    this.bubble = new SpeechBubble(ctx.scene);
    ctx.combat.register(this);
    this.applyRig();
  }

  get floorY(): number {
    return this.motion.floorY;
  }
  private get x(): number {
    return this.motion.x;
  }
  private get hullBottom(): number {
    return this.motion.hullBottom;
  }
  private get facing(): 1 | -1 {
    return this.motion.facing;
  }
  get defeated(): boolean {
    return this.health <= 0;
  }
  get gone(): boolean {
    return this.finished;
  }
  get targetable(): boolean {
    return this.brain.action !== "dormant" && !this.defeated;
  }
  get centerX(): number {
    return this.x;
  }
  get hullY(): number {
    return this.hullBottom;
  }

  hurtbox(): Rect {
    const top = this.hullBottom - HULL_HEIGHT;
    // On legs (or a spring) the whole machine down to the floor is hittable.
    const bottom = this.brain.phase === 2 ? this.hullBottom : this.floorY;
    return { x: this.x - 40, y: top, width: 80, height: bottom - top };
  }

  engage(): void {
    this.act(this.brain.wake());
  }

  reset(): void {
    if (this.finished) return;
    this.brain.reset();
    this.health = TRON_MAX_HEALTH;
    this.motion.reset();
    this.waves.clear();
    this.bubble.hide();
    this.rig.rebuild();
    this.ctx.level.restoreCells(this.wreckage.fragile, "oneWay");
    this.ctx.level.restoreCells(this.wreckage.collapse, "solid");
    this.applyRig();
  }

  takeHit(hit: HitInfo): HitResult {
    if (!this.targetable || this.brain.invulnerable || hit.damage <= 0) return MISSED;
    const damage = this.brain.exposed ? hit.damage : hit.damage - TRON_ARMOUR;
    if (damage <= 0) {
      audio.sfx.play("enemy_hit", { pitch: 0.5, volume: 0.6 });
      this.ctx.fx.word("CLANK!", hit.x, hit.y - 10, "white");
      return MISSED;
    }
    this.health = Math.max(this.brain.healthFloor, this.health - damage);
    this.flashTimer = 0.07;
    this.hurtTimer = 0.4;
    audio.sfx.play("boss_hit");
    if (this.health > 0) return { applied: true, defeated: false };
    this.beginDefeat();
    return { applied: true, defeated: true };
  }

  fixedUpdate(dt: number): boolean {
    if (this.finished) return false;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.rig.setTint(this.flashTimer > 0);
    this.bubble.follow(this.x + this.facing * 12, this.hullBottom - 56);
    if (this.defeatTimer >= 0) {
      this.updateDefeat(dt);
      return !this.finished;
    }
    this.act(this.brain.update(dt, this.health));
    this.move(dt);
    this.waves.update(dt);
    this.strikeWithArm();
    this.touchPlayer();
    this.applyRig();
    return true;
  }

  // ── Cues ──────────────────────────────────────────────────────────────────
  private act(cues: readonly TronCue[]): void {
    for (const cue of cues) this.handle(cue);
  }

  private handle(cue: TronCue): void {
    const { fx } = this.ctx;
    const player = this.ctx.player;
    switch (cue) {
      case "taunt1":
        this.say("SO! THE MUTANT CRAWLED ALL THE WAY DOWN HERE!");
        break;
      case "taunt2":
        this.say("BEHOLD... THE FLUSH-O-TRON 3000!");
        audio.sfx.play("boss_roar");
        fx.shake(0.8, 600);
        break;
      case "nameCard":
        showStageCard(this.ctx.scene, "FLUSH-O-TRON 3000", "PROFESSOR STINKBOTTOM IN THE");
        break;
      case "stompWindup":
        audio.sfx.play("mech_stomp", { pitch: 1.4, volume: 0.5 });
        break;
      case "stompSlam":
        audio.sfx.play("mech_stomp");
        fx.shake(0.8, 250);
        fx.dust(this.x - 30, this.floorY, true);
        fx.dust(this.x + 30, this.floorY);
        this.waves.spawn(this.x);
        break;
      case "plungeOut":
        audio.sfx.play("plunger_fire");
        this.contactKey = `tron-plunger-${++tronHitSerial}`;
        break;
      case "plungeIn":
        break;
      case "lobShot":
        audio.sfx.play("snot_fire", { pitch: 0.7 });
        lob(this.ctx, "flushBomb", this.tankTop(), {
          x: player.x + (Math.random() - 0.5) * 60,
          y: this.floorY,
        });
        break;
      case "ventStart":
        audio.sfx.play("hydrant_spray", { pitch: 0.7 });
        fx.word("HISSSS!", this.x, this.hullBottom - 80, "white");
        break;
      case "legsOff":
        this.say("MY BEAUTIFUL LEGS!");
        this.explode(4);
        this.rig.detachLegs();
        break;
      case "gratesSmash":
        this.smash(this.wreckage.fragile, false);
        break;
      case "bombDrop":
        audio.sfx.play("snot_fire", { pitch: 0.5 });
        fireStraight(
          this.ctx,
          "flushBomb",
          { x: this.x, y: this.hullBottom },
          { vx: (Math.random() - 0.5) * 80, vy: 40 },
        );
        break;
      case "diveStart":
        this.contactKey = `tron-dive-${++tronHitSerial}`;
        this.motion.diveAt(player.x);
        audio.sfx.play("fan_whoosh", { pitch: 0.6 });
        break;
      case "overheatStart":
        audio.sfx.play("ammo_empty", { pitch: 0.5 });
        fx.word("OVERHEAT!", this.x, this.hullBottom - 80, "pink");
        break;
      case "crash":
        this.say("NO NO NO! NOT THE PLUMBING!");
        this.explode(5);
        this.motion.stall();
        break;
      case "floorCollapse":
        this.smash(this.wreckage.collapse, true);
        break;
      case "lidOff":
        audio.sfx.play("barrel_explode");
        fx.shake(0.7, 250);
        this.rig.blowLid();
        break;
      case "hopStart":
        this.motion.hopToward(player.x);
        audio.sfx.play("ball_bounce", { pitch: 0.5 });
        break;
      case "flaskThrow":
        audio.sfx.play("turnip_throw");
        lob(this.ctx, "flask", this.seat(), { x: player.x, y: this.floorY }, 60);
        break;
      case "missileFire":
        audio.sfx.play("plunger_fire");
        fireStraight(
          this.ctx,
          "plungerMissile",
          this.tankTop(),
          { vx: this.facing * 160, vy: -90 },
          true,
        );
        break;
    }
  }

  // ── Movement ──────────────────────────────────────────────────────────────
  private move(dt: number): void {
    const events = this.motion.update(this.brain, dt, this.ctx.player.x);
    if (events.includes("landed")) {
      audio.sfx.play("mech_stomp", { volume: 0.6 });
      this.ctx.fx.shake(0.4);
    }
    if (this.brain.action === "overheat" && Math.random() < 0.15) {
      this.ctx.fx.particles("stink", this.x, this.hullBottom - 50, 1);
    }
  }

  // ── Damage dealt ──────────────────────────────────────────────────────────
  private strikeWithArm(): void {
    const tip = this.rig.armTip();
    if (!tip || armLength(this.brain) < ARM_REACH * 0.7) return;
    this.strikePlayer(rectAround(tip.x, tip.y, 12), 1, this.contactKey);
  }

  private touchPlayer(): void {
    if (!this.brain.dangerous) return;
    const diving = this.brain.action === "dive" && this.brain.time > 0.45;
    const key = diving
      ? this.contactKey
      : `tron-touch-${Math.floor(this.brain.time * 2)}-${this.brain.action}`;
    this.strikePlayer(this.hurtbox(), diving ? 2 : 1, key);
  }

  private strikePlayer(area: Rect, damage: number, key: string): void {
    const player = this.ctx.player;
    if (!player.targetable || !overlaps(area, player.hurtbox())) return;
    const hit: HitInfo = {
      key,
      team: "enemy",
      kind: "melee",
      damage,
      knockbackX: (player.x < this.x ? -1 : 1) * 260,
      knockbackY: -280,
      x: player.x,
      y: player.y - 16,
      impact: 0.7,
    };
    for (const outcome of this.ctx.combat.strike(area, hit)) {
      presentHit(this.ctx.fx, hit, outcome.result, ["CLONK!", "PLUNGED!"]);
    }
  }

  // ── Arena destruction, intro, defeat ──────────────────────────────────────
  private smash(cells: readonly Cell[], flood: boolean): void {
    if (flood) this.ctx.level.flood(cells);
    else this.ctx.level.breakCells(cells);
    audio.sfx.play(flood ? "wall_crumble" : "crate_break");
    this.ctx.fx.shake(1, 500);
    for (const { tx, ty } of cells) {
      const x = tx * 16 + 8;
      const y = ty * 16 + 8;
      this.ctx.fx.particles(flood ? "brick" : "spark", x, y, 3);
      if (flood) this.ctx.fx.particles("slime", x, y, 2);
    }
  }

  private explode(bursts: number): void {
    audio.sfx.play("boss_explode", { pitch: 1.2 });
    this.ctx.fx.shake(1, 400);
    for (let i = 0; i < bursts; i++) {
      const x = this.x + Phaser.Math.Between(-36, 36);
      const y = this.hullBottom + Phaser.Math.Between(-60, 10);
      this.ctx.scene.time.delayedCall(i * 120, () => {
        this.ctx.fx.burst(x, y);
        this.ctx.fx.particles("spark", x, y, 6);
      });
    }
  }

  private say(text: string): void {
    this.bubble.say(text, VOICE_PITCH);
  }

  private beginDefeat(): void {
    this.brain.defeat();
    this.defeatTimer = 0;
    this.waves.clear();
    audio.sfx.play("boss_explode");
    this.ctx.fx.hitStop(250);
    this.ctx.fx.word("KA-FLUSH!", this.x, this.hullBottom - 90, "gold");
  }

  private updateDefeat(dt: number): void {
    const before = this.defeatTimer;
    this.defeatTimer += dt;
    const crossed = (t: number) => before < t && this.defeatTimer >= t;
    if (Math.floor(this.defeatTimer * 7) !== Math.floor(before * 7) && this.defeatTimer < 2.4) {
      const x = this.x + Phaser.Math.Between(-40, 40);
      const y = this.hullBottom + Phaser.Math.Between(-70, 0);
      this.ctx.fx.burst(x, y);
      this.ctx.fx.particles("spark", x, y, 6);
      this.ctx.fx.particles("water", x, y, 4);
      this.ctx.fx.shake(0.6);
      audio.sfx.play("enemy_pop", { pitch: 0.5 + Math.random() * 0.5 });
    }
    if (crossed(0.8)) {
      this.rig.ejectProfessor();
      this.say("CURSE YOU, BULGO! THIS ISN'T OVER!");
      audio.sfx.play("boss_roar", { pitch: 1.6 });
    }
    if (crossed(2.2)) {
      audio.sfx.play("boss_explode", { pitch: 0.8 });
      this.ctx.fx.shake(1, 600);
      this.rig.sink();
    }
    // Once the wreck starts sinking, its own tween moves it.
    if (this.defeatTimer < 2.2) this.applyRig();
    if (this.defeatTimer < DEFEAT_SECONDS) return;
    this.ctx.addScore(DEFEAT_POINTS, this.x, this.hullBottom - 60);
    this.ctx.combat.unregister(this);
    this.finished = true;
  }

  // ── Rig ───────────────────────────────────────────────────────────────────
  private applyRig(): void {
    this.rig.apply(
      tronPose(this.brain, this.motion, {
        hurt: this.hurtTimer > 0,
        defeated: this.defeatTimer >= 0,
      }),
    );
  }

  private tankTop(): { x: number; y: number } {
    return { x: this.x - this.facing * 22, y: this.hullBottom - HULL_HEIGHT };
  }

  private seat(): { x: number; y: number } {
    return { x: this.x + this.facing * 12, y: this.hullBottom - 50 };
  }
}
