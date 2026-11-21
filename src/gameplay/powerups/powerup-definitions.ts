/**
 * What each power-up is called, how long it lasts and how it's announced.
 * The effects themselves live with the player (`player-powerups.ts`).
 */
import type { StingerId } from "../../audio/audio-types";
import type { PowerUpId } from "./powerup-ids";

export interface PowerUpDefinition {
  id: PowerUpId;
  name: string;
  /** One-line banner subtitle. */
  blurb: string;
  /** Seconds it lasts; collecting it again refreshes the timer. */
  duration: number;
  stinger: StingerId;
}

export const POWERUPS: Readonly<Record<PowerUpId, PowerUpDefinition>> = {
  wreckingBall: {
    id: "wreckingBall",
    name: "WRECKING BALL",
    blurb: "ROLL OVER EVERYTHING!",
    duration: 12,
    stinger: "transform",
  },
  infiniteSocks: {
    id: "infiniteSocks",
    name: "INFINITE SOCKS",
    blurb: "UNLIMITED RAPID-FIRE SOCKS!",
    duration: 15,
    stinger: "powerup",
  },
  hyperGrease: {
    id: "hyperGrease",
    name: "HYPER GREASE",
    blurb: "SLIPPERY WHEN WET!",
    duration: 12,
    stinger: "rare_powerup",
  },
};

/** The last few seconds of a power-up blink on the HUD (and the ball wobbles). */
export const POWERUP_WARNING_SECONDS = 2.5;
