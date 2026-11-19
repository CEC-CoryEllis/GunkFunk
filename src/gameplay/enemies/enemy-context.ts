/**
 * What enemies need beyond the generic stage context: someone to chase, a way
 * to spawn more enemies (blobs split), and a way to report knockouts (score,
 * combo).
 */
import type { SfxId } from "../../audio/audio-types";
import type { Rect } from "../combat/hit-types";
import type { StageContext } from "../stage/stage-context";
import type { EnemyKind } from "./enemy-kinds";

/** The player as enemy AI sees it. */
export interface EnemyTarget {
  readonly x: number;
  readonly y: number;
  readonly targetable: boolean;
  hurtbox(): Rect;
}

export interface EnemyHandle {
  readonly kind: EnemyKind;
  readonly x: number;
  readonly y: number;
}

export interface EnemyContext extends StageContext {
  player: EnemyTarget;
  spawnEnemy(kind: EnemyKind, x: number, y: number, options?: EnemySpawnOptions): void;
  /** Called once when an enemy pops after being knocked out. */
  enemyDefeated(enemy: EnemyHandle, points: number): void;
}

export interface EnemySpawnOptions {
  /** Initial velocity (split blobs fly apart). */
  vx?: number;
  vy?: number;
  /** Variant flag interpreted by the enemy (e.g. small blob). */
  small?: boolean;
}

/** Tunables shared by every enemy type. */
export interface EnemyStats {
  kind: EnemyKind;
  sheetKey: string;
  maxHealth: number;
  points: number;
  body: { w: number; h: number };
  /** Downward acceleration; 0 for flyers. */
  gravity: number;
  /** Damage for touching it while it's active (0 = harmless to touch). */
  contactDamage: number;
  /** Knockback is divided by this (heavy enemies barely budge). */
  weight: number;
  /** Lives in sludge and doesn't mind it. */
  sludgeImmune?: boolean;
  hurtSfx: SfxId;
  /** Comic words thrown on knockout. */
  words: readonly string[];
}
