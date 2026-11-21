/**
 * Interactive prop identifiers and their level-map characters.
 * Dependency-free so the level format and art can import it.
 */
export type PropKind =
  | "crate"
  | "barrel"
  | "launchToilet"
  | "vending"
  | "hydrant"
  | "fan"
  | "platform"
  | "trashCan"
  | "snack"
  | "gem";

export const PROP_MAP_CHARS: Readonly<Record<string, PropKind>> = {
  X: "crate",
  O: "barrel",
  U: "launchToilet",
  V: "vending",
  Y: "hydrant",
  W: "fan",
  "=": "platform",
  K: "trashCan",
  "+": "snack",
  $: "gem",
};

/** Item kinds that can be picked up (also dropped by crates, cans and vending machines). */
export type ItemKind = "snack" | "feast" | "gem";
