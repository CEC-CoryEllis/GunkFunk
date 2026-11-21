import type { WeaponId } from "../gameplay/weapons/weapon-ids";

/**
 * Cross-scene events, emitted on `game.events` so the HUD (a separate scene)
 * can react to gameplay without holding references to it.
 */
export const GameEvents = {
  HealthChanged: "health-changed",
  LivesChanged: "lives-changed",
  ScoreChanged: "score-changed",
  GemsChanged: "gems-changed",
  StageIntro: "stage-intro",
  WeaponChanged: "weapon-changed",
} as const;

/** Registry key holding the latest `WeaponHudPayload` (null = unarmed). */
export const PLAYER_WEAPON_KEY = "playerWeapon";
/** Registry key: the power-ups currently running, `ActivePowerUp[]` (HUD timers). */
export const PLAYER_POWERUPS_KEY = "player-powerups";

export interface WeaponHudPayload {
  id: WeaponId;
  name: string;
  level: number;
  ammo: number;
  maxAmmo: number;
  infinite: boolean;
}

/** Registry key holding the latest `HealthChangedPayload` for late subscribers like the HUD. */
export const PLAYER_HEALTH_KEY = "playerHealth";

export interface HealthChangedPayload {
  health: number;
  maxHealth: number;
}
