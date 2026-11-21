/**
 * Chooses which animation the player's sprite should show, from movement
 * state, combat state and life state. Owns the small timers that give
 * one-shot animations (land, double jump, bored idle) room to play out.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import type { MovementController, MovementEvent } from "./movement-controller";

const BORED_AFTER = 7;
const LAND_TIME = 0.16;
const DOUBLE_JUMP_TIME = 0.25;

/** `dead` = death animation finished, waiting for the scene to respawn or end the game. */
export type LifeState = "alive" | "hurt" | "dying" | "dead" | "respawning" | "celebrating";

export interface AnimatorInput {
  movement: MovementController;
  vx: number;
  vy: number;
  onFloor: boolean;
  climbingMoving: boolean;
  /** Melee / charge animation that overrides movement, or null. */
  combatAnim: string | null;
  /** Holding a gun out: pick the standing, running or airborne shooting pose. */
  shooting: boolean;
  life: LifeState;
}

export class PlayerAnimator {
  private idleTime = 0;
  private landTimer = 0;
  private doubleJumpTimer = 0;
  private playingBored = false;

  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly sheetKey: string,
  ) {}

  onMovementEvents(events: readonly MovementEvent[]): void {
    if (events.includes("land") || events.includes("hardLand")) this.landTimer = LAND_TIME;
    if (events.includes("doubleJump")) this.doubleJumpTimer = DOUBLE_JUMP_TIME;
    if (events.length > 0) this.resetIdle();
  }

  resetIdle(): void {
    this.idleTime = 0;
    this.playingBored = false;
  }

  /** Returns true when the bored animation just started (for the bored quip). */
  update(input: AnimatorInput, dt: number): boolean {
    this.landTimer = Math.max(0, this.landTimer - dt);
    this.doubleJumpTimer = Math.max(0, this.doubleJumpTimer - dt);
    this.sprite.setFlipX(input.movement.facing < 0);
    const name = this.pick(input, dt);
    const startedBored = name === "bored" && !this.playingBored;
    if (name === "bored") this.playingBored = true;
    this.play(name);
    if (name === "climb") {
      if (input.climbingMoving) this.sprite.anims.resume();
      else this.sprite.anims.pause();
    }
    return startedBored;
  }

  private pick(input: AnimatorInput, dt: number): string {
    const m = input.movement;
    if (input.life === "dying" || input.life === "dead") return "death";
    if (input.life === "respawning") return "respawn";
    if (input.life === "celebrating") return "victory";
    if (input.life === "hurt") return "hurt";
    if (input.combatAnim) return input.combatAnim;
    if (input.shooting && (m.state === "ground" || m.state === "air")) {
      if (m.state === "air") return "air_shoot";
      if (m.crouching) return "crouch_shoot";
      return Math.abs(input.vx) > 30 ? "run_shoot" : "shoot";
    }
    switch (m.state) {
      case "climb":
        return "climb";
      case "slide":
        return "slide";
      case "wallSlide":
        return "wall_slide";
      case "air":
        if (this.doubleJumpTimer > 0) return "double_jump";
        return input.vy < 0 ? "jump" : "fall";
      case "ground":
        break;
    }
    if (this.landTimer > 0) return "land";
    if (m.crouching) return "crouch";
    if (m.skidding) return "skid";
    const speed = Math.abs(input.vx);
    if (speed > 100) return "run";
    if (speed > 6) return "walk";
    this.idleTime += dt;
    if (this.playingBored) {
      const done = this.isCurrent("bored") && !this.sprite.anims.isPlaying;
      if (done) this.resetIdle();
      else return "bored";
    }
    return this.idleTime > BORED_AFTER ? "bored" : "idle";
  }

  private isCurrent(name: string): boolean {
    return this.sprite.anims.currentAnim?.key === animationKey(this.sheetKey, name);
  }

  private play(name: string): void {
    const key = animationKey(this.sheetKey, name);
    if (this.sprite.anims.currentAnim?.key === key) return;
    this.sprite.anims.play(key);
  }

  /** Forces an animation to restart (each combo hit restarts even if repeated). */
  restart(name: string): void {
    this.sprite.anims.play(animationKey(this.sheetKey, name));
  }

  isFinished(name: string): boolean {
    return this.isCurrent(name) && !this.sprite.anims.isPlaying;
  }
}
