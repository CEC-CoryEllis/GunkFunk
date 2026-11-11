/**
 * Cross-scene events, emitted on `game.events` so the HUD (a separate scene)
 * can react to gameplay without holding references to it.
 */
export const GameEvents = {
  HealthChanged: "health-changed",
  LivesChanged: "lives-changed",
  ScoreChanged: "score-changed",
  StageIntro: "stage-intro",
} as const;

/** Registry key holding the latest `HealthChangedPayload` for late subscribers like the HUD. */
export const PLAYER_HEALTH_KEY = "playerHealth";

export interface HealthChangedPayload {
  health: number;
  maxHealth: number;
}
