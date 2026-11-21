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
 *   .  empty (space also works)
 *
 * Spawns stand on the floor of their tile, except pickups, which float in
 * the middle of it.
 */
import type { MusicTrackId } from "../audio/audio-types";
import type { WeaponId } from "../gameplay/weapons/weapon-ids";

export type TerrainKind = "empty" | "solid" | "oneWay" | "ladder" | "sludge" | "spikes";

export type SpawnKind = "playerStart" | "dummy" | "weaponPickup";

export interface SpawnSpec {
  kind: SpawnKind;
  weapon?: WeaponId;
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
