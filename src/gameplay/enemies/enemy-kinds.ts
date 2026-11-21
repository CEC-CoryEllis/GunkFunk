/**
 * Enemy identifiers and their level-map characters. Dependency-free so the
 * level format and art modules can import it without pulling in gameplay.
 */
export type EnemyKind = "rat" | "toilet" | "blob" | "turnip" | "roach";

export const ENEMY_KINDS: readonly EnemyKind[] = ["rat", "toilet", "blob", "turnip", "roach"];

/** Level-map characters: R rat, T toilet, B blob, G turnip grenadier, F flying roach. */
export const ENEMY_MAP_CHARS: Readonly<Record<string, EnemyKind>> = {
  R: "rat",
  T: "toilet",
  B: "blob",
  G: "turnip",
  F: "roach",
};
