/**
 * Boss identifiers and their level-map characters. Dependency-free so the
 * level format can import it.
 */
export type BossKind = "clog" | "flushotron";

/**
 * `@` THE CLOG, `!` the Flush-o-Tron 3000. A boss's arena is the space between
 * the `|` gates on either side of it.
 */
export const BOSS_MAP_CHARS: Readonly<Record<string, BossKind>> = {
  "@": "clog",
  "!": "flushotron",
};
