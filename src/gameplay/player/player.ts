/**
 * The player entity: glues a character definition to a physics sprite and
 * runs movement, combat, health, hazards and presentation each fixed step.
 * It is also a `Damageable` in the shared combat world.
 */
import * as Phaser from "phaser";
import { audio } from "../../audio";
import { type ActionSnapshot, emptySnapshot } from "../../core/input/actions";
import { SpeechBubble } from "../../ui/speech-bubble";
import type { CameraTarget } from "../camera/camera-director";
import type { CharacterDefinition, QuipTrigger } from "../characters/character-definition";
import {
  type Damageable,
  type HitInfo,
  type HitResult,
  MISSED,
  type Rect,
  knockbackFor,
} from "../combat/hit-types";
import type { PickupCollector } from "../pickups/weapon-pickup";
import type { PowerUpId } from "../powerups/powerup-ids";
import type { PropPlayer } from "../props/prop-context";
import type { StageContext } from "../stage/stage-context";
import { HeldWeapon } from "../weapons/held-weapon";
import type { CollectOutcome, OwnedWeapon } from "../weapons/weapon-inventory";
import type { WeaponId } from "../weapons/weapon-ids";
import { WreckingBall } from "./forms/wrecking-ball";
import { MovementController } from "./movement-controller";
import { DEFAULT_TUNING } from "./movement-tuning";
import { type LifeState, PlayerAnimator } from "./player-animator";
import { type CombatFrame, PlayerCombat } from "./player-combat";
import { playCombatFeedback, playMovementFeedback } from "./player-feedback";
import { fireShots, landMelee } from "./player-attacks";
import { PlayerHealth } from "./player-health";
import { PlayerPowerUps } from "./player-powerups";
import { PlayerShape } from "./player-shape";
import { PlayerTransformations } from "./player-transformations";
import { readSensors } from "./player-sensors";
import { QuipDirector } from "./quip-director";

const HURT_TIME = 0.35;
const HAZARD_BOUNCE = 360;
const CHARGE_WALK_SCALE = 0.35;
/** Grace period after turning back from the ball. */
const DEFLATE_INVULNERABLE = 0.8;

export interface PlayerCallbacks {
  onHealthChanged(health: number, max: number): void;
  /** Called once the death animation has finished playing. */
  onDied(): void;
  /** Current weapon, level or ammo changed. */
  onWeaponChanged(weapon: OwnedWeapon | null): void;
  onWeaponCollected(outcome: CollectOutcome): void;
  /** A power-up started (or refreshed) or ended. */
  onPowerUp(id: PowerUpId, active: boolean): void;
}

export class Player implements CameraTarget, Damageable, PickupCollector, PropPlayer {
  readonly team = "player" as const;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly movement: MovementController;
  readonly combat: PlayerCombat;
  readonly health: PlayerHealth;
  readonly powerUps: PlayerPowerUps;
  /** The Wrecking Ball form; while active it drives the body instead of normal movement. */
  readonly ball: WreckingBall;
  private readonly transforms: PlayerTransformations;
  life: LifeState = "alive";
  /** Last combat step, read by the debug overlay and presentation. */
  lastCombat?: CombatFrame;

  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly animator: PlayerAnimator;
  private readonly quips: QuipDirector;
  private readonly bubble: SpeechBubble;
  private readonly held: HeldWeapon;
  private lifeTimer = 0;
  private readonly shape: PlayerShape;

  constructor(
    private readonly ctx: StageContext,
    readonly definition: CharacterDefinition,
    private readonly callbacks: PlayerCallbacks,
    spawn: { x: number; y: number },
  ) {
    const { scene } = ctx;
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, definition.sheetKey, 0);
    this.sprite.setDepth(20);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.shape = new PlayerShape(this.sprite, this.body, definition);
    this.movement = new MovementController({ ...DEFAULT_TUNING, ...definition.tuning });
    this.combat = new PlayerCombat(definition);
    this.health = new PlayerHealth(definition.maxHealth);
    this.powerUps = new PlayerPowerUps(this.combat.inventory, this.movement);
    this.ball = new WreckingBall(ctx, this.sprite, this.body, definition.sheetKey);
    this.transforms = new PlayerTransformations(this.powerUps, this.ball, {
      changed: (id, active) => {
        this.callbacks.onPowerUp(id, active);
        this.callbacks.onWeaponChanged(this.combat.inventory.current);
      },
      say: (trigger) => this.say(trigger, true),
      cancelCombat: () => {
        this.combat.cancel();
        this.lastCombat = undefined;
      },
      restoreBulgo: (announce) => this.restoreBulgo(announce),
    });
    this.animator = new PlayerAnimator(this.sprite, definition.sheetKey);
    this.quips = new QuipDirector(definition.quips);
    this.bubble = new SpeechBubble(scene);
    this.held = new HeldWeapon(scene, this.sprite, definition.sheetKey);
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onAnimationFrame, this);
    ctx.combat.register(this);
  }

  // ── CameraTarget ──────────────────────────────────────────────────────────
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get facing(): 1 | -1 {
    return this.movement.facing;
  }
  get grounded(): boolean {
    return this.body.blocked.down || this.movement.state === "climb";
  }

  // ── Damageable / PickupCollector ──────────────────────────────────────────
  get targetable(): boolean {
    return this.life === "alive" || this.life === "hurt";
  }

  hurtbox(): Rect {
    return {
      x: this.body.left,
      y: this.body.top,
      width: this.body.width,
      height: this.body.height,
    };
  }

  bodyRect(): Rect {
    return this.hurtbox();
  }

  // ── PropPlayer: how the world pushes Bulgo around ─────────────────────────
  get falling(): boolean {
    return this.body.velocity.y > 0;
  }

  /** Hyper Grease is running (the grease trail reads this). */
  get greasy(): boolean {
    return this.powerUps.isActive("hyperGrease") && !this.ball.active;
  }

  launch(speed: number): void {
    if (!this.targetable) return;
    if (this.ball.active) {
      this.ball.launch(speed);
      return;
    }
    this.movement.launch();
    this.movement.refreshAirJumps();
    this.body.setVelocityY(-speed);
  }

  addLift(acceleration: number): void {
    if (!this.targetable) return;
    if (this.ball.active) this.ball.addLift(acceleration);
    else this.movement.addLift(acceleration);
  }

  carry(dx: number, dy: number): void {
    this.sprite.x += dx;
    this.sprite.y += dy;
  }

  heal(amount: number): boolean {
    if (!this.targetable || this.health.health >= this.health.maxHealth) return false;
    this.health.heal(amount);
    this.callbacks.onHealthChanged(this.health.health, this.health.maxHealth);
    return true;
  }

  takeHit(hit: HitInfo): HitResult {
    if (this.ball.active) return this.transforms.absorbHit(hit);
    const applied = this.takeDamage(
      hit.damage,
      hit.radial ? hit.x : this.x - knockbackFor(hit, this.x),
    );
    return applied ? { applied, defeated: this.health.dead } : MISSED;
  }

  collectWeapon(id: WeaponId): boolean {
    if (!this.targetable) return false;
    const outcome = this.combat.inventory.collect(id);
    audio.music.stinger("weapon_get");
    this.say(outcome.kind === "new" ? "weaponGet" : "upgrade", true);
    this.held.showFor(0.8);
    this.callbacks.onWeaponCollected(outcome);
    this.callbacks.onWeaponChanged(this.combat.inventory.current);
    return true;
  }

  /** Picking up a power-up: starts it (or refreshes its timer). */
  collectPowerUp(id: PowerUpId): boolean {
    if (!this.targetable) return false;
    this.transforms.collect(id);
    return true;
  }

  say(trigger: QuipTrigger, force = false): void {
    const line = this.quips.trigger(trigger, force);
    if (line) this.bubble.say(line, this.definition.voicePitch);
  }

  /** Runs once per fixed physics step. */
  fixedUpdate(input: ActionSnapshot, dt: number): void {
    this.health.tick(dt);
    this.quips.tick(dt);
    if (this.life === "dying" || this.life === "dead" || this.life === "respawning") {
      this.updateLifeSequence(dt);
    } else {
      this.transforms.tick(dt);
      if (this.ball.active) this.updateBall(input, dt);
      else this.updateAlive(input, dt);
    }
    this.sprite.setVisible(
      this.health.invulnerable <= 0 || Math.floor(this.health.invulnerable * 20) % 2 === 0,
    );
  }

  /** Runs every render frame (presentation that should be smooth at any refresh rate). */
  frameUpdate(dt: number): void {
    this.bubble.follow(this.sprite.x, this.sprite.y - 44);
    const frame = this.lastCombat;
    const weapon = this.ball.active ? null : this.combat.inventory.current;
    this.held.sync(weapon, frame?.shooting ?? false, this.facing, dt);
    const now = this.ctx.scene.time.now;
    // A charged punch makes Bulgo strobe like he's about to blow; a ball about
    // to run out of air flashes white.
    const ballEnding = this.transforms.ballEnding;
    if (frame?.chargeReady && Math.floor(now / 60) % 2 === 0) {
      this.sprite.setTintFill(0xfff27a);
    } else if (ballEnding && Math.floor(now / 110) % 2 === 0) {
      this.sprite.setTintFill(0xffffff);
    } else if (this.sprite.tintFill) {
      this.sprite.clearTint();
    }
  }

  private updateAlive(input: ActionSnapshot, dt: number): void {
    if (this.life === "hurt") {
      this.lifeTimer -= dt;
      if (this.lifeTimer <= 0) this.life = "alive";
    }
    const sensors = readSensors(this.body, this.ctx.level, this.definition.body.stand.h);
    const controllable = this.life === "alive";
    const frame = this.combat.update(input, dt, {
      canAct: controllable,
      onGround: this.body.blocked.down,
      state: this.movement.state,
      crouching: this.movement.crouching,
    });
    this.lastCombat = frame;
    this.movement.speedScale = frame.charging ? CHARGE_WALK_SCALE : 1;
    if (frame.meleeStarted) {
      this.animator.restart(frame.meleeStarted.anim);
      if (frame.meleeStarted.lunge) this.body.setVelocityX(this.facing * frame.meleeStarted.lunge);
    }

    const out = this.movement.update(controllable ? input : NO_INPUT, sensors, dt);
    let vx = out.vx;
    if (frame.attack && this.body.blocked.down) vx *= frame.attack.moveScale;
    this.body.setVelocity(vx, out.vy);
    if (out.snapX !== undefined) this.sprite.x = out.snapX;

    this.animator.onMovementEvents(out.events);
    if (frame.meleeStarted || frame.shot || frame.charging) this.animator.resetIdle();
    const feedback = {
      fx: this.ctx.fx,
      x: this.x,
      y: this.y,
      facing: this.facing,
      say: (t: QuipTrigger) => this.say(t),
    };
    playMovementFeedback(out.events, feedback);
    playCombatFeedback(frame, {
      ...feedback,
      comboIndex: this.combat.combo.index,
      finisherIndex: this.definition.combo.length - 1,
    });
    this.shape.setLow(this.movement.crouching || this.movement.state === "slide");
    this.checkHazards();
    if (this.sprite.y > this.ctx.level.heightPx + 64) this.die();

    const startedBored = this.animator.update(
      {
        movement: this.movement,
        vx,
        vy: out.vy,
        onFloor: sensors.onFloor,
        climbingMoving: out.vy !== 0,
        combatAnim: frame.anim,
        shooting: frame.shooting,
        life: this.life,
      },
      dt,
    );
    if (startedBored) this.say("bored", true);
    this.resolveCombat(frame);
  }

  private updateBall(input: ActionSnapshot, dt: number): void {
    if (this.life === "hurt") this.life = "alive";
    this.lastCombat = undefined;
    this.transforms.updateBall(input, dt);
    if (this.sprite.y > this.ctx.level.heightPx + 64) this.die();
  }

  /** After the ball deflates (or on death): Bulgo's own sheet, body and movement come back. */
  private restoreBulgo(announce: boolean): void {
    this.shape.restore();
    this.movement.state = "air";
    this.movement.facing = this.ball.controller.facing;
    this.animator.restart("fall");
    if (!announce) return;
    this.health.invulnerable = Math.max(this.health.invulnerable, DEFLATE_INVULNERABLE);
    this.say("deflate", true);
  }

  /** Spawns this step's shots and lands this step's punches. */
  private resolveCombat(frame: CombatFrame): void {
    if (frame.shot) {
      if (this.movement.state === "ground" && Math.abs(this.body.velocity.x) <= 30) {
        this.animator.restart(this.movement.crouching ? "crouch_shoot" : "shoot");
      }
      fireShots(this.ctx, this.held, frame.shot.level, this);
      this.held.playFire(frame.shot.weapon);
      this.callbacks.onWeaponChanged(this.combat.inventory.current);
    }
    if (frame.switched) {
      this.held.showFor();
      this.callbacks.onWeaponChanged(frame.switched);
    }
    landMelee(this.ctx, this.combat, frame, this);
  }

  /** World-space rectangle of the live melee hit, or null between hit windows (debug drawing). */
  attackHitbox(): Rect | null {
    return this.combat.hitbox(this.x, this.y, this.facing, this.lastCombat?.hitActive ?? false);
  }

  private checkHazards(): void {
    const hazard = this.ctx.level.hazardAt(this.shape.feetRect());
    if (hazard) this.hazardBounce(1, hazard === "sludge" ? "sludge" : "hurt");
  }

  private hazardBounce(damage: number, quip: QuipTrigger): void {
    audio.sfx.play("sludge_splash");
    this.ctx.fx.dust(this.x, this.y);
    this.movement.launch();
    this.body.setVelocityY(-HAZARD_BOUNCE);
    if (this.takeDamage(damage, 0)) this.say(quip, quip === "sludge");
  }

  /** Applies damage with knockback away from `fromX` (0 = straight up). Returns true if applied. */
  takeDamage(amount: number, fromX: number): boolean {
    if (!this.targetable) return false;
    if (!this.health.damage(amount)) return false;
    this.callbacks.onHealthChanged(this.health.health, this.health.maxHealth);
    this.combat.cancel();
    audio.sfx.play("hurt");
    this.ctx.fx.shake(0.5);
    this.ctx.fx.hitStop(60);
    if (this.health.dead) {
      this.die();
      return true;
    }
    this.life = "hurt";
    this.lifeTimer = HURT_TIME;
    if (fromX !== 0) {
      const away = this.x < fromX ? -1 : 1;
      this.body.setVelocity(away * 160, -240);
      this.movement.controlLock = HURT_TIME;
    }
    this.say("hurt");
    return true;
  }

  private die(): void {
    if (this.life === "dying") return;
    this.transforms.dropAll();
    this.life = "dying";
    this.health.health = 0;
    this.callbacks.onHealthChanged(0, this.health.maxHealth);
    this.combat.cancel();
    this.lastCombat = undefined;
    this.bubble.hide();
    this.body.setVelocity(0, 0);
    audio.sfx.play("player_death");
    audio.music.stinger("death");
    this.showLifeAnimation("dying");
    this.lifeTimer = 2.2;
  }

  private updateLifeSequence(dt: number): void {
    this.lifeTimer -= dt;
    this.body.setVelocityX(0);
    // Corpses still fall (and land) so the melt happens on the floor — or
    // float on the surface if Bulgo met his end in a vat of sludge.
    const resting =
      this.body.blocked.down || this.ctx.level.rectTouches(this.shape.feetRect(), "sludge");
    this.body.setVelocityY(
      resting ? 0 : Math.min(this.body.velocity.y + this.movement.tuning.gravity * dt, 300),
    );
    if (this.lifeTimer > 0) return;
    if (this.life === "dying") {
      this.life = "dead";
      this.callbacks.onDied();
    } else if (this.life === "respawning") {
      this.life = "alive";
    }
  }

  /** Stage clear: everything stops and Bulgo dances. */
  celebrate(): void {
    this.transforms.dropAll();
    this.combat.cancel();
    this.lastCombat = undefined;
    this.bubble.hide();
    this.life = "celebrating";
    this.body.setVelocityX(0);
    this.showLifeAnimation("celebrating");
  }

  /** Puts the player back at a checkpoint with full health and a "ta-da". */
  respawn(at: { x: number; y: number }): void {
    this.sprite.setPosition(at.x, at.y);
    this.body.reset(at.x, at.y);
    this.movement.state = "air";
    this.movement.facing = 1;
    this.health.restore();
    this.callbacks.onHealthChanged(this.health.health, this.health.maxHealth);
    this.life = "respawning";
    this.lifeTimer = 0.9;
    audio.sfx.play("respawn");
    this.showLifeAnimation("respawning");
    this.ctx.scene.time.delayedCall(500, () => this.say("respawn", true));
  }

  private showLifeAnimation(life: LifeState): void {
    this.animator.update(
      {
        movement: this.movement,
        vx: 0,
        vy: 0,
        onFloor: true,
        climbingMoving: false,
        combatAnim: null,
        shooting: false,
        life,
      },
      0,
    );
  }

  private onAnimationFrame(
    anim: Phaser.Animations.Animation,
    frame: Phaser.Animations.AnimationFrame,
  ): void {
    const running = anim.key.endsWith(":run") || anim.key.endsWith(":run_shoot");
    if (running && (frame.index === 2 || frame.index === 6)) {
      audio.sfx.play("footstep", { volume: 0.45 });
    }
  }
}

const NO_INPUT: ActionSnapshot = emptySnapshot();
