/**
 * Stage data format. Stages are authored as ASCII grids (one character per
 * 16×16 tile) so they are readable and diffable in code review.
 *
 *   Terrain              Spawns
 *   #  solid wall        P  player start
 *   -  one-way platform
 *   H  ladder / chain
 *   ~  toxic sludge (hazard)
 *   ^  rusty spikes (hazard)
 *   .  empty (space also works)
 */
import type { MusicTrackId } from "../audio/audio-types";

export type TerrainKind = "empty" | "solid" | "oneWay" | "ladder" | "sludge" | "spikes";

export type SpawnKind = "playerStart";

export const TERRAIN_LEGEND: Readonly<Record<string, TerrainKind>> = {
  ".": "empty",
  " ": "empty",
  "#": "solid",
  "-": "oneWay",
  H: "ladder",
  "~": "sludge",
  "^": "spikes",
};

export const SPAWN_LEGEND: Readonly<Record<string, SpawnKind>> = {
  P: "playerStart",
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
