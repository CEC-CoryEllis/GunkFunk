/**
 * Where the Flush-o-Tron is and how it moves for each action: walking on its
 * legs, hovering and diving on its jets, sputtering down when it overheats,
 * and hopping on its last spring. Kinematic — the arena floor is flat, so it
 * moves along known heights instead of colliding with tiles.
 */
import * as Phaser from "phaser";
import type { Rect } from "../combat/hit-types";
import type { FlushOTronBrain } from "./flushotron-brain";
import { LEG_HEIGHT, type LegsPose, SPRING_HEIGHT } from "./flushotron-rig";

const WALK_SPEED = 60;
/** Low enough to stay in view under the HUD; jumping into it hurts. */
const HOVER_ALTITUDE = 58;
const OVERHEAT_ALTITUDE = 6;
const DIVE_SPEED = 330;
const HOP_SPEED = { x: 150, y: 390 };
const GRAVITY = 900;
/** Keeps the hull's centre this far inside the arena walls. */
const WALL_MARGIN = 44;

export type MotionEvent = "landed";

/** Which way the legs are bent for the current action. */
export function legsPoseFor(brain: FlushOTronBrain): LegsPose {
  const { action, time } = brain;
  if (action === "vent") return "kneel";
  if (action === "walk") return "walk";
  if (action === "stomp" && time < 0.55) return "crouch";
  return "stand";
}

export class TronMotion {
  x: number;
  /** World y of the hull's bottom edge. */
  hullBottom: number;
  facing: 1 | -1 = -1;
  private vx = 0;
  private vy = 0;

  constructor(
    private readonly home: { x: number; y: number },
    private readonly arena: Rect,
  ) {
    this.x = home.x;
    this.hullBottom = home.y - LEG_HEIGHT.stand;
  }

  get floorY(): number {
    return this.home.y;
  }

  reset(): void {
    this.x = this.home.x;
    this.hullBottom = this.home.y - LEG_HEIGHT.stand;
    this.vx = 0;
    this.vy = 0;
  }

  /** Dive at the floor where Bulgo is standing. */
  diveAt(targetX: number): void {
    const dx = targetX - this.x;
    const dy = this.floorY - 10 - this.hullBottom;
    const length = Math.hypot(dx, dy) || 1;
    this.vx = (dx / length) * DIVE_SPEED;
    this.vy = (dy / length) * DIVE_SPEED;
  }

  /** Spring off toward Bulgo. */
  hopToward(targetX: number): void {
    this.facing = targetX < this.x ? -1 : 1;
    this.vx = this.facing * HOP_SPEED.x;
    this.vy = -HOP_SPEED.y;
  }

  /** Crash: whatever it was doing, it drops. */
  stall(): void {
    this.vx = 0;
    this.vy = 0;
  }

  update(brain: FlushOTronBrain, dt: number, playerX: number): MotionEvent[] {
    const { action, time } = brain;
    const minX = this.arena.x + WALL_MARGIN;
    const maxX = this.arena.x + this.arena.width - WALL_MARGIN;
    const face = () => (this.facing = playerX < this.x ? -1 : 1);
    switch (action) {
      case "walk":
        face();
        this.x = Phaser.Math.Clamp(this.x + this.facing * WALK_SPEED * dt, minX, maxX);
        this.ease(this.floorY - LEG_HEIGHT[legsPoseFor(brain)], 12, dt);
        break;
      case "intro":
      case "stomp":
      case "lob":
      case "vent":
        face();
        this.ease(this.floorY - LEG_HEIGHT[legsPoseFor(brain)], 12, dt);
        break;
      case "plunge":
        this.ease(this.floorY - LEG_HEIGHT.stand, 12, dt);
        break;
      case "breakdown1":
        this.x += Math.sin(time * 60) * 0.6;
        if (time > 0.6) this.ease(this.floorY - HOVER_ALTITUDE, 2, dt);
        break;
      case "hover":
      case "bomb": {
        const targetX = Phaser.Math.Clamp(playerX, minX, maxX);
        this.x += (targetX - this.x) * Math.min(1, (action === "bomb" ? 1.2 : 2) * dt);
        this.ease(this.floorY - HOVER_ALTITUDE + Math.sin(time * 4) * 6, 3, dt);
        face();
        break;
      }
      case "dive":
        if (time < 0.45) {
          this.ease(this.floorY - HOVER_ALTITUDE - 20, 4, dt);
          break;
        }
        this.x = Phaser.Math.Clamp(this.x + this.vx * dt, minX, maxX);
        this.hullBottom = Math.min(this.floorY - 10, this.hullBottom + this.vy * dt);
        break;
      case "overheat":
        this.ease(this.floorY - OVERHEAT_ALTITUDE, 3, dt);
        break;
      case "breakdown2":
        this.ease(this.floorY - SPRING_HEIGHT.squashed, 6, dt);
        this.x += Math.sin(time * 50) * 0.5;
        break;
      case "hop":
      case "flasks":
      case "missiles":
        return this.bounce(dt, minX, maxX);
      default:
        break;
    }
    return [];
  }

  /** Phase 3: ballistic hops that land back on the floor (sludge or not). */
  private bounce(dt: number, minX: number, maxX: number): MotionEvent[] {
    const ground = this.floorY - SPRING_HEIGHT.squashed;
    if (this.hullBottom >= ground && this.vy >= 0) {
      const landed = this.vy > 120;
      this.hullBottom = ground;
      this.vx = 0;
      this.vy = 0;
      return landed ? ["landed"] : [];
    }
    this.vy += GRAVITY * dt;
    this.x = Phaser.Math.Clamp(this.x + this.vx * dt, minX, maxX);
    this.hullBottom = Math.min(ground, this.hullBottom + this.vy * dt);
    return [];
  }

  private ease(targetBottom: number, rate: number, dt: number): void {
    this.hullBottom += (targetBottom - this.hullBottom) * Math.min(1, rate * dt);
  }
}
