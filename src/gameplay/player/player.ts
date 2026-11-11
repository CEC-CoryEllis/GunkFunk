/**
 * The player entity: glues a character definition to a physics sprite and
 * runs movement, melee, health, hazards and presentation each fixed step.
 */
import * as Phaser from "phaser";
import { applySheetOrigin, getSheetInfo } from "../../art/texture-registry";
import { audio } from "../../audio";
import { type ActionSnapshot, emptySnapshot } from "../../core/input/actions";
import type { LevelWorld } from "../../levels/level-world";
import { SpeechBubble } from "../../ui/speech-bubble";
import type { CameraTarget } from "../camera/camera-director";
import type {
  CharacterDefinition,
  MeleeAttack,
  QuipTrigger,
} from "../characters/character-definition";
import type { Effects } from "../fx/effects";
import { MeleeCombo } from "./melee-combo";
import { MovementController } from "./movement-controller";
import { DEFAULT_TUNING } from "./movement-tuning";
import { type LifeState, PlayerAnimator } from "./player-animator";
import { playMovementFeedback } from "./player-feedback";
import { PlayerHealth } from "./player-health";
import { readSensors } from "./player-sensors";
import { QuipDirector } from "./quip-director";

const HURT_TIME = 0.35;
const HAZARD_BOUNCE = 360;

export interface PlayerCallbacks {
  onHealthChanged(health: number, max: number): void;
  /** Called once the death animation has finished playing. */
  onDied(): void;
}

export class Player implements CameraTarget {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly movement: MovementController;
  readonly combo: MeleeCombo;
  readonly health: PlayerHealth;
  life: LifeState = "alive";
  /** True during the current attack's hit window (read by combat in M4). */
  attackActive = false;

  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly animator: PlayerAnimator;
  private readonly quips: QuipDirector;
  private readonly bubble: SpeechBubble;
  private lifeTimer = 0;
  private lowBody: boolean | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: LevelWorld,
    private readonly fx: Effects,
    readonly definition: CharacterDefinition,
    private readonly callbacks: PlayerCallbacks,
    spawn: { x: number; y: number },
  ) {
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, definition.sheetKey, 0);
    applySheetOrigin(this.sprite, definition.sheetKey);
    this.sprite.setDepth(20);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.setBodySize(false);
    this.movement = new MovementController({ ...DEFAULT_TUNING, ...definition.tuning });
    this.combo = new MeleeCombo(definition.combo, definition.airAttack);
    this.health = new PlayerHealth(definition.maxHealth);
    this.animator = new PlayerAnimator(this.sprite, definition.sheetKey);
    this.quips = new QuipDirector(definition.quips);
    this.bubble = new SpeechBubble(scene);
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.onAnimationFrame, this);
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
      this.updateAlive(input, dt);
    }
    this.sprite.setVisible(
      this.health.invulnerable <= 0 || Math.floor(this.health.invulnerable * 20) % 2 === 0,
    );
  }

  /** Runs every render frame (presentation that should be smooth at any refresh rate). */
  frameUpdate(): void {
    this.bubble.follow(this.sprite.x, this.sprite.y - 44);
  }

  private updateAlive(input: ActionSnapshot, dt: number): void {
    if (this.life === "hurt") {
      this.lifeTimer -= dt;
      if (this.lifeTimer <= 0) this.life = "alive";
    }
    const sensors = readSensors(this.body, this.level, this.definition.body.stand.h);
    const controllable = this.life === "alive";
    const attack = this.updateCombat(input, dt, controllable);
    const out = this.movement.update(controllable ? input : NO_INPUT, sensors, dt);
    let vx = out.vx;
    if (attack && this.body.blocked.down) vx *= attack.moveScale;
    this.body.setVelocity(vx, out.vy);
    if (out.snapX !== undefined) this.sprite.x = out.snapX;

    this.animator.onMovementEvents(out.events);
    playMovementFeedback(out.events, {
      fx: this.fx,
      x: this.x,
      y: this.y,
      facing: this.facing,
      say: (t) => this.say(t),
    });
    this.setBodySize(this.movement.crouching || this.movement.state === "slide");
    this.checkHazards();
    if (this.sprite.y > this.level.heightPx + 64) this.die();

    const startedBored = this.animator.update(
      {
        movement: this.movement,
        vx,
        vy: out.vy,
        onFloor: sensors.onFloor,
        climbingMoving: out.vy !== 0,
        attackAnim: this.combo.current?.anim ?? null,
        life: this.life,
      },
      dt,
    );
    if (startedBored) this.say("bored", true);
  }

  private updateCombat(
    input: ActionSnapshot,
    dt: number,
    controllable: boolean,
  ): MeleeAttack | null {
    const canAttack =
      controllable && this.movement.state !== "climb" && this.movement.state !== "slide";
    const step = this.combo.update(dt, canAttack && input.pressed.attack, this.body.blocked.down);
    if (step.started) {
      this.animator.restart(step.started.anim);
      this.animator.resetIdle();
      audio.sfx.play(step.started.swingSfx);
      if (step.started.lunge) this.body.setVelocityX(this.facing * step.started.lunge);
      if (this.combo.index === this.definition.combo.length - 1) this.say("combo");
    }
    this.attackActive = step.active;
    return this.combo.current;
  }

  /** World-space rectangle of the live attack, or null between hit windows. */
  attackHitbox(): Phaser.Geom.Rectangle | null {
    const attack = this.combo.current;
    if (!attack || !this.attackActive) return null;
    const hb = attack.hitbox;
    const x = this.facing > 0 ? this.sprite.x + hb.x : this.sprite.x - hb.x - hb.w;
    return new Phaser.Geom.Rectangle(x, this.sprite.y + hb.y, hb.w, hb.h);
  }

  /** The bottom few pixels of the body: what touches floors, hazards and liquids. */
  private feetRect(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.body.left + 2,
      this.body.bottom - 6,
      this.body.width - 4,
      6,
    );
  }

  private checkHazards(): void {
    const rect = this.feetRect();
    if (this.level.rectTouches(rect, "sludge")) {
      this.hazardBounce(1, "sludge");
    } else if (this.level.rectTouches(rect, "spikes")) {
      this.hazardBounce(1, "hurt");
    }
  }

  private hazardBounce(damage: number, quip: QuipTrigger): void {
    audio.sfx.play("sludge_splash");
    this.fx.dust(this.x, this.y);
    this.movement.launch();
    this.body.setVelocityY(-HAZARD_BOUNCE);
    if (this.takeDamage(damage, 0)) this.say(quip, quip === "sludge");
  }

  /** Applies damage with knockback away from `fromX` (0 = straight up). Returns true if applied. */
  takeDamage(amount: number, fromX: number): boolean {
    if (this.life !== "alive" && this.life !== "hurt") return false;
    if (!this.health.damage(amount)) return false;
    this.callbacks.onHealthChanged(this.health.health, this.health.maxHealth);
    this.combo.cancel();
    audio.sfx.play("hurt");
    this.fx.shake(0.5);
    this.fx.hitStop(60);
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
    this.life = "dying";
    this.health.health = 0;
    this.callbacks.onHealthChanged(0, this.health.maxHealth);
    this.combo.cancel();
    this.bubble.hide();
    this.body.setVelocity(0, 0);
    audio.sfx.play("player_death");
    audio.music.stinger("death");
    this.animator.update(
      {
        movement: this.movement,
        vx: 0,
        vy: 0,
        onFloor: true,
        climbingMoving: false,
        attackAnim: null,
        life: "dying",
      },
      0,
    );
    this.lifeTimer = 2.2;
  }

  private updateLifeSequence(dt: number): void {
    this.lifeTimer -= dt;
    this.body.setVelocityX(0);
    // Corpses still fall (and land) so the melt happens on the floor — or
    // float on the surface if Bulgo met his end in a vat of sludge.
    const resting = this.body.blocked.down || this.level.rectTouches(this.feetRect(), "sludge");
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
    this.animator.update(
      {
        movement: this.movement,
        vx: 0,
        vy: 0,
        onFloor: true,
        climbingMoving: false,
        attackAnim: null,
        life: "respawning",
      },
      0,
    );
    this.scene.time.delayedCall(500, () => this.say("respawn", true));
  }

  private setBodySize(low: boolean): void {
    if (low === this.lowBody) return;
    this.lowBody = low;
    const info = getSheetInfo(this.definition.sheetKey);
    const size = low ? this.definition.body.low : this.definition.body.stand;
    this.body.setSize(size.w, size.h, false);
    this.body.setOffset(info.originX - size.w / 2, info.originY - size.h);
  }

  private onAnimationFrame(
    anim: Phaser.Animations.Animation,
    frame: Phaser.Animations.AnimationFrame,
  ): void {
    if (anim.key.endsWith(":run") && (frame.index === 2 || frame.index === 6)) {
      audio.sfx.play("footstep", { volume: 0.45 });
    }
  }
}

const NO_INPUT: ActionSnapshot = emptySnapshot();
