/**
 * Wrecking Ball physics: heavy rolling momentum, rubbery bounces off floors and
 * walls, a big bouncy jump and a ground pound. Pure — sensors in, velocity and
 * events out — so the feel is unit tested like Bulgo's own movement.
 *
 * Arcade zeroes velocity on contact, so bounces use the speed the ball had
 * going *into* the contact, which the controller remembers from last step.
 */
import type { BodySensors } from "../movement-controller";

export interface BallTuning {
  maxSpeed: number;
  groundAccel: number;
  airAccel: number;
  /** Deceleration while rolling with no input (momentum carries). */
  rollFriction: number;
  gravity: number;
  maxFallSpeed: number;
  jumpSpeed: number;
  jumpBufferTime: number;
  coyoteTime: number;
  /** Landing faster than this bounces back up. */
  bounceMinSpeed: number;
  bounciness: number;
  /** Hitting a wall faster than this bounces off it. */
  wallBounceMinSpeed: number;
  wallBounciness: number;
  slamSpeed: number;
  slamRebound: number;
}

export const BALL_TUNING: BallTuning = {
  maxSpeed: 330,
  groundAccel: 650,
  airAccel: 420,
  rollFriction: 150,
  gravity: 1150,
  maxFallSpeed: 520,
  jumpSpeed: 470,
  jumpBufferTime: 0.12,
  coyoteTime: 0.1,
  bounceMinSpeed: 250,
  bounciness: 0.5,
  wallBounceMinSpeed: 90,
  wallBounciness: 0.65,
  slamSpeed: 640,
  slamRebound: 240,
};

export type BallEvent = "jump" | "bounce" | "wallBounce" | "slamStart" | "slamLand" | "land";

export interface BallInput {
  moveX: number;
  jumpPressed: boolean;
  downPressed: boolean;
}

export interface BallOutput {
  vx: number;
  vy: number;
  events: BallEvent[];
  /** Speed of the impact behind a bounce / wall bounce / slam (for effects and damage). */
  impactSpeed: number;
}

const LIFT_DRAG = 4;
const MAX_LIFT_SPEED = 300;

export class BallController {
  facing: 1 | -1 = 1;
  slamming = false;
  private vx = 0;
  private vy = 0;
  private airborne = false;
  private coyote = 0;
  private jumpBuffer = 0;
  private lift = 0;
  private launchSpeed = 0;
  /** Which wall the ball was already resting against (pushing into it doesn't bounce). */
  private wallContact: -1 | 0 | 1 = 0;

  constructor(readonly tuning: BallTuning = BALL_TUNING) {}

  /** Starts rolling with the given velocity (keeps Bulgo's momentum on transforming). */
  reset(vx: number, vy: number, facing: 1 | -1): void {
    this.vx = vx;
    this.vy = vy;
    this.facing = facing;
    this.slamming = false;
    this.airborne = vy !== 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
  }

  /** Fires the ball upward next step (launch toilets). */
  launch(speed: number): void {
    this.launchSpeed = speed;
  }

  /** Upward acceleration for the next step (vent fans). */
  addLift(acceleration: number): void {
    this.lift += acceleration;
  }

  update(input: BallInput, s: BodySensors, dt: number): BallOutput {
    const t = this.tuning;
    const events: BallEvent[] = [];
    let impactSpeed = 0;
    let vx = this.vx;
    let vy = this.vy;
    const onFloor = s.onFloor && vy >= 0;

    this.jumpBuffer = input.jumpPressed ? t.jumpBufferTime : Math.max(0, this.jumpBuffer - dt);
    this.coyote = onFloor ? t.coyoteTime : Math.max(0, this.coyote - dt);

    // Landing: slam, bounce, or settle.
    if (onFloor && this.airborne) {
      this.airborne = false;
      impactSpeed = vy;
      if (this.slamming) {
        this.slamming = false;
        vy = -t.slamRebound;
        events.push("slamLand");
      } else if (vy >= t.bounceMinSpeed) {
        vy = -vy * t.bounciness;
        events.push("bounce");
      } else {
        vy = 0;
        events.push("land");
      }
    }

    // Walls: a fresh hit bounces back with most of the speed.
    const side: -1 | 0 | 1 = vx > 0 && s.wallRight ? 1 : vx < 0 && s.wallLeft ? -1 : 0;
    const freshHit = side !== 0 && side !== this.wallContact;
    this.wallContact = side !== 0 ? side : s.wallLeft ? -1 : s.wallRight ? 1 : 0;
    if (side !== 0) {
      if (freshHit && Math.abs(vx) >= t.wallBounceMinSpeed) {
        impactSpeed = Math.max(impactSpeed, Math.abs(vx));
        vx = -vx * t.wallBounciness;
        events.push("wallBounce");
      } else {
        vx = 0;
      }
    }

    if (this.slamming) {
      vx *= 1 - Math.min(1, 6 * dt);
    } else {
      vx = this.steer(vx, input.moveX, onFloor, dt);
    }

    // Jump (buffered, with coyote time) and ground pound.
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.slamming) {
      vy = -t.jumpSpeed;
      this.jumpBuffer = 0;
      this.coyote = 0;
      events.push("jump");
    } else if (input.downPressed && this.airborne && !this.slamming) {
      this.slamming = true;
      vy = t.slamSpeed;
      vx *= 0.3;
      events.push("slamStart");
    }
    if (this.launchSpeed > 0) {
      vy = -this.launchSpeed;
      this.launchSpeed = 0;
      this.slamming = false;
    }

    vy = this.applyGravity(vy, onFloor && vy >= 0, dt);
    if (vy < 0) this.airborne = true;
    if (!s.onFloor) this.airborne = true;
    if (Math.abs(vx) > 10) this.facing = vx > 0 ? 1 : -1;
    this.vx = vx;
    this.vy = vy;
    return { vx, vy, events, impactSpeed };
  }

  private steer(vx: number, moveX: number, onFloor: boolean, dt: number): number {
    const t = this.tuning;
    if (moveX === 0) {
      if (!onFloor) return vx;
      const slowed = Math.abs(vx) - t.rollFriction * dt;
      return slowed <= 0 ? 0 : Math.sign(vx) * slowed;
    }
    const accel = onFloor ? t.groundAccel : t.airAccel;
    // Reversing digs in harder than speeding up.
    const reversing = Math.sign(vx) !== 0 && Math.sign(vx) !== Math.sign(moveX);
    const next = vx + moveX * accel * (reversing ? 1.6 : 1) * dt;
    return Math.max(-t.maxSpeed, Math.min(t.maxSpeed, next));
  }

  private applyGravity(vy: number, resting: boolean, dt: number): number {
    const t = this.tuning;
    const lift = this.lift;
    this.lift = 0;
    // Keep pressing into the floor so Arcade keeps reporting contact.
    if (resting && lift <= t.gravity) return t.gravity * dt;
    const maxFall = this.slamming ? t.slamSpeed : t.maxFallSpeed;
    let next = Math.min(vy + (t.gravity - lift) * dt, maxFall);
    if (lift > 0) {
      next -= next * LIFT_DRAG * dt;
      next = Math.max(next, -MAX_LIFT_SPEED);
    }
    return next;
  }
}
