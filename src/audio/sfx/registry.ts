/** Every SFX recipe by id, plus the thematic grouping used by the sound test. */
import type { SfxId } from "../audio-types";
import { BOSS_SFX } from "./recipes/bosses";
import { ENEMY_SFX } from "./recipes/enemies";
import { ENVIRONMENT_SFX } from "./recipes/environment";
import { PLAYER_SFX } from "./recipes/player";
import { UI_SFX } from "./recipes/ui";
import { WEAPON_SFX } from "./recipes/weapons";
import type { SfxDef } from "./types";

const SFX_GROUPS = {
  ui: UI_SFX,
  player: PLAYER_SFX,
  weapons: WEAPON_SFX,
  enemies: ENEMY_SFX,
  environment: ENVIRONMENT_SFX,
  "bosses & transform": BOSS_SFX,
} as const;

/** Compile-time exhaustive: a missing SfxId is a type error here. */
export const SFX: Record<SfxId, SfxDef> = {
  ...UI_SFX,
  ...PLAYER_SFX,
  ...WEAPON_SFX,
  ...ENEMY_SFX,
  ...ENVIRONMENT_SFX,
  ...BOSS_SFX,
};

export const SFX_IDS = Object.keys(SFX) as SfxId[];

export function sfxGroupIds(): Record<string, SfxId[]> {
  return Object.fromEntries(
    Object.entries(SFX_GROUPS).map(([group, recipes]) => [group, Object.keys(recipes) as SfxId[]]),
  );
}
