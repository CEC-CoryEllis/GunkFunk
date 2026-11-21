/**
 * The shared damage vocabulary. Every attack in the game — punches, socks,
 * exploding chickens, hazards, enemies flung into other enemies — is a
 * `HitInfo`, and everything that can be hurt is a `Damageable`. One pipeline
 * means chain reactions need no special cases.
 */
import type { SfxId } from "../../audio/audio-types";

/**
 * Who a hit belongs to. Targets are never on the "environment" team, so
 * environmental hits (barrel blasts, toppling vending machines) hurt everyone.
 */
export type Team = "player" | "enemy" | "neutral" | "environment";

export type HitKind = "melee" | "projectile" | "explosion" | "hazard" | "launched";

/** Plain rectangle so combat logic stays independent of Phaser. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HitInfo {
  /**
   * Identifies one swing / projectile / explosion. A target is hit at most once
   * per key, so a punch's active frames don't multi-hit.
   */
  key: string;
  team: Team;
  kind: HitKind;
  damage: number;
  /** World-space knockback velocity to give the target. */
  knockbackX: number;
  knockbackY: number;
  /** Impact point, for sparks and popups. */
  x: number;
  y: number;
  /** 0..1: how much hit-stop, shake and spectacle this hit deserves. */
  impact: number;
  /** Sound played on contact (defaults by kind). */
  sfx?: SfxId;
  /** Explosions: knock targets away from (x, y) with |knockbackX| instead of a fixed direction. */
  radial?: boolean;
  /** Weapon side effects targets can react to (snot gums them up). */
  status?: "slimed";
}

/** The horizontal knockback a target should take from a hit, given its own centre. */
export function knockbackFor(hit: HitInfo, targetCenterX: number): number {
  if (!hit.radial) return hit.knockbackX;
  return (targetCenterX >= hit.x ? 1 : -1) * Math.abs(hit.knockbackX);
}

export interface HitResult {
  applied: boolean;
  defeated: boolean;
}

export interface Damageable {
  readonly team: Team;
  /** False while defeated, respawning or otherwise not hittable. */
  readonly targetable: boolean;
  hurtbox(): Rect;
  takeHit(hit: HitInfo): HitResult;
}

export const MISSED: HitResult = { applied: false, defeated: false };

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectAround(x: number, y: number, halfWidth: number, halfHeight = halfWidth): Rect {
  return { x: x - halfWidth, y: y - halfHeight, width: halfWidth * 2, height: halfHeight * 2 };
}
