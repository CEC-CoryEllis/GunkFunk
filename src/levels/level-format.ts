/**
 * Stage data format. Stages are authored as ASCII grids (one character per
 * 16×16 tile) so they are readable and diffable in code review.
 *
 *   Terrain              Spawns
 *   #  solid wall        P  player start
 *   -  one-way platform  D  training dummy
 *   H  ladder / chain    s  Sock Cannon pickup
 *   ~  toxic sludge      n  Snot Blaster pickup
 *   ^  rusty spikes      c  Chicken Launcher pickup
 *   .  empty             R  Sewer Rat       T  Toilet Chomper
 *                        B  Sludge Blob     G  Turnip Grenadier
 *                        F  Disco Roach (flying)
 *
 * Spawns stand on the floor of their tile, except pickups, which float in
 * the middle of it.
 */
import type { MusicTrackId } from "../audio/audio-types";
import { ENEMY_MAP_CHARS, type EnemyKind } from "../gameplay/enemies/enemy-kinds";
import type { WeaponId } from "../gameplay/weapons/weapon-ids";

export type TerrainKind = "empty" | "solid" | "oneWay" | "ladder" | "sludge" | "spikes";

export type SpawnKind = "playerStart" | "dummy" | "weaponPickup" | "enemy";

export interface SpawnSpec {
  kind: SpawnKind;
  weapon?: WeaponId;
  enemy?: EnemyKind;
}

export const TERRAIN_LEGEND: Readonly<Record<string, TerrainKind>> = {
  ".": "empty",
  " ": "empty",
  "#": "solid",
  "-": "oneWay",
  H: "ladder",
  "~": "sludge",
  "^": "spikes",
};

export const SPAWN_LEGEND: Readonly<Record<string, SpawnSpec>> = {
  P: { kind: "playerStart" },
  D: { kind: "dummy" },
  s: { kind: "weaponPickup", weapon: "sock" },
  n: { kind: "weaponPickup", weapon: "snot" },
  c: { kind: "weaponPickup", weapon: "chicken" },
  ...Object.fromEntries(
    Object.entries(ENEMY_MAP_CHARS).map(([ch, enemy]) => [
      ch,
      { kind: "enemy", enemy } satisfies SpawnSpec,
    ]),
  ),
};

export type LevelTheme = "sewer";

export interface LevelDefinition {
  id: string;
  /** Shown on the stage intro card. */
  title: string;
  subtitle: string;
  theme: LevelTheme;
  music: MusicTrackId;
  rows: readonly string[];
}

export interface Spawn {
  kind: SpawnKind;
  weapon?: WeaponId;
  enemy?: EnemyKind;
  /** Tile coordinates. */
  tx: number;
  ty: number;
}

export interface ParsedLevel {
  widthTiles: number;
  heightTiles: number;
  terrain: TerrainKind[][];
  spawns: Spawn[];
  playerStart: { tx: number; ty: number };
}
