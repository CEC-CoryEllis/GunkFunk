/**
 * Platformer movement as a pure state machine. It reads input + collision
 * sensors and outputs the velocity for the next physics step plus events
 * (for sound, particles and animation). No Phaser types, so feel can be unit
 * tested frame by frame.
 *
 * Feel features: acceleration curves, skid turns, coyote time, jump
 * buffering, variable jump height, apex hang, fast-fall, double jump,
 * wall slide + wall jump, crouch, slide, ladders, one-way drop-through.
 */
import type { ActionSnapshot } from "../../core/input/actions";
import type { MovementTuning } from "./movement-tuning";

export interface BodySensors {
  vx: number;
  vy: number;
  onFloor: boolean;
  /** Standing on a one-way platform or ladder top (drop-through allowed). */
  onPassThrough: boolean;
  wallLeft: boolean;
  wallRight: boolean;
  /** Body overlaps a ladder tile; `ladderX` is its centre. */
  onLadder: boolean;
  /** Standing on top of a ladder (down starts a descent). */
  ladderBelow: boolean;
  ladderX: number;
  /** Something solid directly above a crouching/sliding body. */
  ceilingLow: boolean;
}

export type MovementState = "ground" | "air" | "wallSlide" | "slide" | "climb";

export type MovementEvent =
  | "jump"
  | "doubleJump"
  | "wallJump"
  | "land"
  | "hardLand"
  | "skid"
  | "slideStart"
  | "climbStart"
  | "dropThrough";

export interface MovementOutput {
  vx: number;
  vy: number;
  /** Snap the body to this x (ladder centring), if set. */
  snapX?: number;
  events: MovementEvent[];
}

function approach(value: number, target: number, step: number): number {
  return value < target ? Math.min(value + step, target) : Math.max(value - step, target);
}

export class MovementController {
  state: MovementState = "air";
  facing: 1 | -1 = 1;
  crouching = false;
  skidding = false;
  /** True while the body should ignore one-way platforms. */
  droppingThrough = false;
  /** When > 0, horizontal input is ignored (wall jumps, attacks, knockback). */
  controlLock = 0;
  /** Multiplier on horizontal speed (attacks slow you, power-ups speed you up). */
  speedScale = 1;

  private airJumpsLeft = 0;
  private coyote = 0;
  private jumpBuffer = 0;
  private jumpHeld = false;
  private slideTimer = 0;
  private dropTimer = 0;
  private peakFallSpeed = 0;

  constructor(public tuning: MovementTuning) {}

  /** Lets external systems (knockback, springs, toilets) launch the body. */
  launch(): void {
    this.state = "air";
    this.coyote = 0;
    this.jumpHeld = false;
  }

  /** Refunds the air jump (enemy bounces, springs). */
  refreshAirJumps(): void {
    this.airJumpsLeft = this.tuning.airJumps;
  }

  update(input: ActionSnapshot, s: BodySensors, dt: number): MovementOutput {
    const t = this.tuning;
    const events: MovementEvent[] = [];
    this.controlLock = Math.max(0, this.controlLock - dt);
    this.jumpBuffer = input.pressed.jump ? t.jumpBufferTime : Math.max(0, this.jumpBuffer - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.droppingThrough = this.dropTimer > 0;
    if (!input.held.jump) this.jumpHeld = false;

    let vx = s.vx;
    let vy = s.vy;
    const moveX = this.controlLock > 0 ? 0 : input.moveX;

    this.updateGrounding(s, vy, dt, events);

    // Ladders take over completely while climbing.
    const climbUp = s.onLadder && input.held.up;
    const climbDown = input.held.down && (s.ladderBelow || (s.onLadder && !s.onFloor));
    if (this.state !== "climb" && (climbUp || climbDown) && this.controlLock === 0) {
      this.state = "climb";
      this.crouching = false;
      events.push("climbStart");
    }
    if (this.state === "climb") {
      return this.updateClimb(input, s, events);
    }

    // Drop through one-way platforms: down + jump.
    if (s.onFloor && s.onPassThrough && input.held.down && this.jumpBuffer > 0) {
      this.jumpBuffer = 0;
      this.dropTimer = t.dropThroughTime;
      this.droppingThrough = true;
      this.state = "air";
      events.push("dropThrough");
      return { vx, vy: 60, events };
    }

    if (this.state === "slide") {
      ({ vx, vy } = this.updateSlide(input, s, vx, vy, dt));
    } else {
      const startedSlide = this.updateCrouch(input, s, vx, events);
      const wasSkidding = this.skidding;
      vx = this.horizontal(moveX, vx, dt, s.onFloor);
      if (this.skidding && !wasSkidding) events.push("skid");
      if (startedSlide) vx = this.facing * t.slideSpeed;
    }

    vy = this.tryJumps(s, vy, events);
    if (events.includes("wallJump")) {
      vx = (s.wallLeft ? 1 : -1) * t.wallJumpSpeedX;
      this.facing = vx > 0 ? 1 : -1;
    }
    vy = this.applyGravity(input, s, vy, dt, moveX);

    if (moveX !== 0 && this.state !== "slide" && this.state !== "wallSlide") {
      this.facing = moveX > 0 ? 1 : -1;
    }
    return { vx, vy, events };
  }

  private updateGrounding(s: BodySensors, vy: number, dt: number, events: MovementEvent[]): void {
    if (s.onFloor) {
      if (this.state === "air" || this.state === "wallSlide") {
        events.push(this.peakFallSpeed > this.tuning.maxFallSpeed * 0.85 ? "hardLand" : "land");
        this.state = "ground";
      }
      this.coyote = this.tuning.coyoteTime;
      this.airJumpsLeft = this.tuning.airJumps;
      this.peakFallSpeed = 0;
    } else {
      this.coyote = Math.max(0, this.coyote - dt);
      this.peakFallSpeed = Math.max(this.peakFallSpeed, vy);
      if (this.state === "ground" || (this.state === "slide" && this.coyote === 0)) {
        this.state = "air";
      }
    }
  }

  /** Updates crouching; returns true if a slide started this step. */
  private updateCrouch(
    input: ActionSnapshot,
    s: BodySensors,
    vx: number,
    events: MovementEvent[],
  ): boolean {
    if (this.state !== "ground") {
      this.crouching = false;
      return false;
    }
    const wantsDown = input.held.down && !input.held.up;
    if (wantsDown && !this.crouching && Math.abs(vx) >= this.tuning.slideMinSpeed) {
      this.state = "slide";
      this.slideTimer = this.tuning.slideDuration;
      this.facing = vx > 0 ? 1 : -1;
      this.crouching = true;
      events.push("slideStart");
      return true;
    }
    this.crouching = wantsDown || (this.crouching && s.ceilingLow);
    return false;
  }

  private updateSlide(input: ActionSnapshot, s: BodySensors, vx: number, vy: number, dt: number) {
    const t = this.tuning;
    this.slideTimer -= dt;
    const progress = Math.max(0, this.slideTimer / t.slideDuration);
    vx = this.facing * Math.max(t.slideSpeed * (0.35 + 0.65 * progress), 40);
    // Keep sliding under low ceilings; otherwise stop when time runs out or blocked.
    const blocked = (this.facing > 0 && s.wallRight) || (this.facing < 0 && s.wallLeft);
    if ((this.slideTimer <= 0 && !s.ceilingLow) || blocked) {
      this.state = s.onFloor ? "ground" : "air";
      this.crouching = s.ceilingLow || input.held.down;
      vx = blocked ? 0 : vx * 0.5;
    }
    return { vx, vy };
  }

  private horizontal(moveX: number, vx: number, dt: number, onFloor: boolean): number {
    const t = this.tuning;
    if (this.crouching && onFloor) {
      this.skidding = false;
      return approach(vx, 0, t.groundDecel * dt);
    }
    const target = moveX * t.runSpeed * this.speedScale;
    const reversing = moveX !== 0 && Math.sign(moveX) !== Math.sign(vx) && Math.abs(vx) > 20;
    this.skidding = onFloor && reversing && Math.abs(vx) > t.runSpeed * 0.6;
    let accel: number;
    if (onFloor) {
      accel = moveX === 0 ? t.groundDecel : reversing ? t.turnAccel : t.groundAccel;
    } else {
      accel = moveX === 0 ? t.airDecel : t.airAccel;
    }
    return approach(vx, target, accel * dt);
  }

  private tryJumps(s: BodySensors, vy: number, events: MovementEvent[]): number {
    const t = this.tuning;
    if (this.jumpBuffer <= 0 || (this.crouching && s.ceilingLow)) {
      return vy;
    }
    const touchingWall = s.wallLeft || s.wallRight;
    if (this.coyote > 0 || this.state === "slide") {
      events.push("jump");
      this.state = "air";
      this.crouching = false;
      this.coyote = 0;
    } else if (this.state === "wallSlide" || (touchingWall && !s.onFloor)) {
      events.push("wallJump");
      this.state = "air";
      this.controlLock = t.wallJumpControlLock;
      this.jumpBuffer = 0;
      this.jumpHeld = true;
      return -t.wallJumpSpeedY;
    } else if (this.airJumpsLeft > 0) {
      this.airJumpsLeft--;
      events.push("doubleJump");
    } else {
      return vy;
    }
    this.jumpBuffer = 0;
    this.jumpHeld = true;
    return events.includes("doubleJump") ? -t.doubleJumpSpeed : -t.jumpSpeed;
  }

  private applyGravity(
    input: ActionSnapshot,
    s: BodySensors,
    vy: number,
    dt: number,
    moveX: number,
  ): number {
    const t = this.tuning;
    if (s.onFloor && vy >= 0 && this.state !== "air") {
      // Keep pressing into the floor: Arcade only resolves (and reports) tile
      // contact when the body moves into it, so a zero velocity would make the
      // body flicker between grounded and airborne every other step.
      return t.gravity * dt;
    }
    // Variable jump height: releasing jump while rising cuts the ascent.
    if (vy < 0 && !this.jumpHeld && input.released.jump) {
      vy *= t.jumpCutMultiplier;
    }
    let gravity = t.gravity;
    if (vy > 0) gravity *= t.fallGravityMultiplier;
    if (Math.abs(vy) < t.apexThreshold && input.held.jump) gravity *= t.apexGravityMultiplier;
    vy = Math.min(vy + gravity * dt, t.maxFallSpeed);

    // Wall slide: airborne, falling, pushing into a wall.
    const pushingWall = (moveX < 0 && s.wallLeft) || (moveX > 0 && s.wallRight);
    if (!s.onFloor && vy > 0 && pushingWall) {
      this.state = "wallSlide";
      this.facing = s.wallRight ? 1 : -1;
      vy = Math.min(vy, t.wallSlideSpeed);
    } else if (this.state === "wallSlide") {
      this.state = "air";
    }
    return vy;
  }

  private updateClimb(
    input: ActionSnapshot,
    s: BodySensors,
    events: MovementEvent[],
  ): MovementOutput {
    const t = this.tuning;
    if (!s.onLadder) {
      this.state = s.onFloor ? "ground" : "air";
      return { vx: 0, vy: input.held.up ? -t.jumpSpeed * 0.5 : 0, events };
    }
    if (this.jumpBuffer > 0) {
      this.jumpBuffer = 0;
      this.state = "air";
      this.jumpHeld = true;
      this.airJumpsLeft = t.airJumps;
      events.push("jump");
      return { vx: input.moveX * t.runSpeed * 0.8, vy: -t.jumpSpeed * 0.8, events };
    }
    if (s.onFloor && input.held.down) {
      this.state = "ground";
      return { vx: 0, vy: 0, events };
    }
    // Ladder tops are pass-through while climbing.
    this.droppingThrough = true;
    this.dropTimer = Math.max(this.dropTimer, 1 / 30);
    const vy = (input.held.down ? 1 : 0) * t.climbSpeed - (input.held.up ? 1 : 0) * t.climbSpeed;
    return { vx: 0, vy, snapX: s.ladderX, events };
  }
}
