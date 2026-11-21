/**
 * What every stage entity (targets, pickups, later enemies and interactive
 * objects) gets handed: the world it lives in and the shared systems it talks
 * to. One object instead of six constructor arguments per entity.
 */
import type * as Phaser from "phaser";
import type { LevelWorld } from "../../levels/level-world";
import type { CombatWorld } from "../combat/combat-world";
import type { Effects } from "../fx/effects";
import type { ProjectileSystem } from "../weapons/projectile-system";

export interface StageContext {
  scene: Phaser.Scene;
  level: LevelWorld;
  combat: CombatWorld;
  fx: Effects;
  projectiles: ProjectileSystem;
  /** Adds to the score and shows a "+N" popup at the given point. */
  addScore(points: number, x: number, y: number): void;
}

export interface StageEntity {
  /** Runs once per fixed physics step. Return false to be removed. */
  fixedUpdate(dt: number): boolean;
  /** Bulgo lost a life and is back at a checkpoint (boss fights reset). */
  playerRespawned?(): void;
}
