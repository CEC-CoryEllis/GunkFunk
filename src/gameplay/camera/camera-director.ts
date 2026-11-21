/**
 * Platformer camera: looks ahead in the facing direction, only re-centres
 * vertically when the target lands or leaves a vertical window (so jumps don't
 * bob the screen), and clamps to the level. Tracks the average of N targets
 * so local co-op can reuse it.
 */
import * as Phaser from "phaser";

export interface CameraTarget {
  x: number;
  y: number;
  facing: 1 | -1;
  grounded: boolean;
}

const LOOK_AHEAD = 44;
const LOOK_AHEAD_SPEED = 2.2;
const FOLLOW_LERP = 7;
const VERTICAL_WINDOW = 46;
/** Puts the target a bit below centre so more of what's above is visible. */
const VERTICAL_BIAS = -18;

export class CameraDirector {
  private readonly levelBounds: Phaser.Geom.Rectangle;
  private lookAhead = 0;
  private focusY: number;
  private x: number;
  private y: number;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    bounds: Phaser.Geom.Rectangle,
    initial: { x: number; y: number },
  ) {
    this.levelBounds = bounds;
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    camera.setRoundPixels(true);
    this.focusY = initial.y;
    this.x = initial.x;
    this.y = initial.y + VERTICAL_BIAS;
    this.apply();
  }

  update(targets: readonly CameraTarget[], dt: number): void {
    if (targets.length === 0) return;
    const avgX = targets.reduce((s, t) => s + t.x, 0) / targets.length;
    const avgY = targets.reduce((s, t) => s + t.y, 0) / targets.length;
    const facing = targets.length === 1 ? targets[0]!.facing : 0;
    const grounded = targets.every((t) => t.grounded);

    this.lookAhead = Phaser.Math.Linear(
      this.lookAhead,
      facing * LOOK_AHEAD,
      Math.min(1, LOOK_AHEAD_SPEED * dt),
    );
    if (grounded || Math.abs(avgY - this.focusY) > VERTICAL_WINDOW) {
      this.focusY = grounded ? avgY : avgY - Math.sign(avgY - this.focusY) * VERTICAL_WINDOW;
    }
    const t = Math.min(1, FOLLOW_LERP * dt);
    this.x = Phaser.Math.Linear(this.x, avgX + this.lookAhead, t);
    this.y = Phaser.Math.Linear(this.y, this.focusY + VERTICAL_BIAS, t);
    this.apply();
  }

  /** Confines the camera to an area (boss arenas), or back to the whole level with null. */
  confine(area: { x: number; y: number; width: number; height: number } | null): void {
    const b = area ?? this.levelBounds;
    this.camera.setBounds(b.x, b.y, b.width, b.height);
  }

  /** Jumps straight to a position (respawns, scene starts). */
  snapTo(x: number, y: number): void {
    this.x = x;
    this.focusY = y;
    this.y = y + VERTICAL_BIAS;
    this.lookAhead = 0;
    this.apply();
  }

  private apply(): void {
    this.camera.centerOn(Math.round(this.x), Math.round(this.y));
  }
}
