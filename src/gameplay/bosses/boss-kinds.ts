/**
 * Boss identifiers and their level-map characters. Dependency-free so the
 * level format can import it.
 */
export type BossKind = "clog";

/** `@` marks where a boss waits; its arena is the space between the `|` gates around it. */
export const BOSS_MAP_CHARS: Readonly<Record<string, BossKind>> = {
  "@": "clog",
};
