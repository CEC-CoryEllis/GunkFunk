/**
 * Weapon identifiers, kept dependency-free so art modules can import them
 * without pulling gameplay code into the art pipeline.
 */
export type WeaponId = "sock" | "snot" | "chicken";

export const WEAPON_IDS: readonly WeaponId[] = ["sock", "snot", "chicken"];

export const MAX_WEAPON_LEVEL = 3;
export type WeaponLevelNumber = 1 | 2 | 3;
