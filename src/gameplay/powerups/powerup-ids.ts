/**
 * Power-up identifiers and their level-map characters. Dependency-free so the
 * level format and art modules can import it.
 */
export type PowerUpId = "wreckingBall" | "infiniteSocks" | "hyperGrease";

export const POWERUP_IDS: readonly PowerUpId[] = ["wreckingBall", "infiniteSocks", "hyperGrease"];

/** Level-map characters: w Wrecking Ball, i Infinite Socks, g Hyper Grease. */
export const POWERUP_MAP_CHARS: Readonly<Record<string, PowerUpId>> = {
  w: "wreckingBall",
  i: "infiniteSocks",
  g: "hyperGrease",
};
