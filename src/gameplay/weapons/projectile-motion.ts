/**
 * Projectile flight against tile terrain, axis by axis: gravity, bouncing off
 * floors and walls with energy loss, and blocking when out of bounces. Pure —
 * the terrain is a `solidAt` predicate — so flight rules are unit tested.
 */

export interface ProjectileBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  bouncesLeft: number;
}

export interface MotionSpec {
  gravity: number;
  bounciness: number;
  friction: number;
}

export type SolidAt = (x: number, y: number) => boolean;

export type MotionEvent = "bounce" | "blocked";

/** Advances the body one step; returns what happened (at most one event per axis). */
export function stepProjectile(
  body: ProjectileBody,
  spec: MotionSpec,
  dt: number,
  solidAt: SolidAt,
): MotionEvent[] {
  const events: MotionEvent[] = [];
  body.vy += spec.gravity * dt;

  const nx = body.x + body.vx * dt;
  const leadX = nx + Math.sign(body.vx) * body.radius;
  if (body.vx !== 0 && solidAt(leadX, body.y)) {
    if (body.bouncesLeft > 0) {
      body.bouncesLeft--;
      body.vx = -body.vx * spec.bounciness;
      events.push("bounce");
    } else {
      events.push("blocked");
      return events;
    }
  } else {
    body.x = nx;
  }

  const ny = body.y + body.vy * dt;
  const leadY = ny + Math.sign(body.vy) * body.radius;
  if (body.vy !== 0 && solidAt(body.x, leadY)) {
    if (body.bouncesLeft > 0) {
      body.bouncesLeft--;
      body.vy = -body.vy * spec.bounciness;
      if (body.vy < 0) body.vx *= spec.friction; // floor bounce scrubs speed
      events.push("bounce");
    } else {
      events.push("blocked");
    }
  } else {
    body.y = ny;
  }
  return events;
}

/**
 * Turns a velocity towards a target by at most `turnRate * dt` radians,
 * keeping its speed (homing chickens).
 */
export function steerToward(
  body: ProjectileBody,
  targetX: number,
  targetY: number,
  turnRate: number,
  dt: number,
): void {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed === 0) return;
  const current = Math.atan2(body.vy, body.vx);
  const desired = Math.atan2(targetY - body.y, targetX - body.x);
  let delta = desired - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const turn = Math.max(-turnRate * dt, Math.min(turnRate * dt, delta));
  body.vx = Math.cos(current + turn) * speed;
  body.vy = Math.sin(current + turn) * speed;
}

/** Velocity for a shot fired at `angleDegrees` above horizontal, mirrored by facing. */
export function launchVelocity(
  angleDegrees: number,
  speed: number,
  facing: 1 | -1,
): { vx: number; vy: number } {
  const radians = (angleDegrees * Math.PI) / 180;
  return { vx: Math.cos(radians) * speed * facing, vy: -Math.sin(radians) * speed };
}

/**
 * Launch velocity that lobs a projectile from the origin onto a target `dx`
 * pixels away horizontally and `dy` pixels away vertically (screen space, +y
 * down) at a fixed launch angle. Returns null if the angle can't reach the
 * target. Used by enemies that throw things in arcs.
 */
export function lobVelocity(
  dx: number,
  dy: number,
  gravity: number,
  angleDegrees: number,
): { vx: number; vy: number } | null {
  const theta = (angleDegrees * Math.PI) / 180;
  const distance = Math.abs(dx);
  const rise = -dy; // positive = target is above
  const denominator = 2 * Math.cos(theta) ** 2 * (distance * Math.tan(theta) - rise);
  if (distance < 1 || denominator <= 0) return null;
  const speed = Math.sqrt((gravity * distance * distance) / denominator);
  return { vx: Math.sign(dx) * Math.cos(theta) * speed, vy: -Math.sin(theta) * speed };
}
