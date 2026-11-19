/**
 * Dynamic music for stages: the full band (intensity 2) kicks in when a fight
 * breaks out around the player and backs off a few seconds after it's over.
 * Pure — the scene feeds it how many enemies are nearby.
 */
import type { MusicIntensity } from "../../audio/audio-types";

/** Enemies within range needed to call it a fight. */
export const FIGHT_THRESHOLD = 2;
/** How long the fight mix lingers after the last nearby enemy. */
export const FIGHT_LINGER_SECONDS = 4;

export class MusicDirector {
  private intensity: MusicIntensity;
  private calm = 0;

  constructor(private readonly baseIntensity: MusicIntensity = 1) {
    this.intensity = baseIntensity;
  }

  /** Returns the new intensity when it should change, otherwise null. */
  update(dt: number, nearbyEnemies: number): MusicIntensity | null {
    if (nearbyEnemies >= FIGHT_THRESHOLD) {
      this.calm = 0;
      if (this.intensity !== 2) return (this.intensity = 2);
      return null;
    }
    this.calm += dt;
    if (this.intensity === 2 && this.calm >= FIGHT_LINGER_SECONDS)
      return (this.intensity = this.baseIntensity);
    return null;
  }
}
