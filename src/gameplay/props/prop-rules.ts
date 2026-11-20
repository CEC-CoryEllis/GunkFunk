/**
 * Pure prop rules, kept free of Phaser so they're unit tested directly.
 */
import type { HitInfo } from "../combat/hit-types";

/** Hits at least this hard break cracked walls. */
export const WALL_BREAK_IMPACT = 0.9;

/** Cracked walls only give way to heavy hits, explosions and bowled bodies. */
export function breaksWall(hit: HitInfo): boolean {
  return hit.impact >= WALL_BREAK_IMPACT || hit.kind === "explosion" || hit.kind === "launched";
}

export type TrashSurprise = "snack" | "gem" | "rat";

/** Weighted surprise table: mostly food, sometimes a tenant, rarely treasure. */
export function rollSurprise(roll: number): TrashSurprise {
  if (roll < 0.5) return "snack";
  if (roll < 0.85) return "rat";
  return "gem";
}
