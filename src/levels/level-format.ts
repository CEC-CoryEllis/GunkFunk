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
 *   .  empty             w  Wrecking Ball   i  Infinite Socks   g  Hyper Grease
 *                        R  Sewer Rat       T  Toilet Chomper
 *                        B  Sludge Blob     G  Turnip Grenadier
 *                        F  Disco Roach (flying)
 *
 *   Props                                   Secrets
 *   X crate        O toxic barrel           %  cracked wall (solid until smashed)
 *   U launch toilet V vending machine       *  secret area (hidden under fake brick
 *   Y fire hydrant W vent fan                  until entered; music changes inside)
 *   K trash can    + snack                  $  Funk Gem
 *   == moving platform (two tiles), shuttling between the : stops in its row
 *      (sideways) or in its columns (up and down)
 *
 *   Stage flow
 *   &  checkpoint        E  stage exit
 *   @  The Clog          |  arena gate (open until the boss fight starts)
 *   !  Flush-o-Tron 3000 _  fragile grate (smashed mid-fight)
 *                        ;  floor that caves into sludge mid-fight
 *
 * Spawns stand on the floor of their tile, except pickups and items, which
 * float in the middle of it.
 */
import type { MusicTrackId } from "../audio/audio-types";
import { BOSS_MAP_CHARS, type BossKind } from "../gameplay/bosses/boss-kinds";
import { ENEMY_MAP_CHARS, type EnemyKind } from "../gameplay/enemies/enemy-kinds";
import { POWERUP_MAP_CHARS, type PowerUpId } from "../gameplay/powerups/powerup-ids";
import { PROP_MAP_CHARS, type PropKind } from "../gameplay/props/prop-kinds";
import type { WeaponId } from "../gameplay/weapons/weapon-ids";

export type TerrainKind = "empty" | "solid" | "oneWay" | "ladder" | "sludge" | "spikes";

export type SpawnKind =
  | "playerStart"
  | "dummy"
  | "weaponPickup"
  | "powerUp"
  | "enemy"
  | "prop"
  | "crackedWall"
  | "secret"
  | "platformStop"
  | "checkpoint"
  | "exit"
  | "boss"
  | "gate"
  | "fragile"
  | "collapse";

export interface SpawnSpec {
  kind: SpawnKind;
  weapon?: WeaponId;
  powerUp?: PowerUpId;
  boss?: BossKind;
  enemy?: EnemyKind;
  prop?: PropKind;
  /** Terrain under the marker (default empty) — cracked walls are solid. */
  terrain?: TerrainKind;
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
  "%": { kind: "crackedWall", terrain: "solid" },
  "*": { kind: "secret" },
  ":": { kind: "platformStop" },
  "&": { kind: "checkpoint" },
  E: { kind: "exit" },
  "|": { kind: "gate" },
  _: { kind: "fragile", terrain: "oneWay" },
  ";": { kind: "collapse", terrain: "solid" },
  ...Object.fromEntries(
    Object.entries(BOSS_MAP_CHARS).map(([ch, boss]) => [
      ch,
      { kind: "boss", boss } satisfies SpawnSpec,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(ENEMY_MAP_CHARS).map(([ch, enemy]) => [
      ch,
      { kind: "enemy", enemy } satisfies SpawnSpec,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(POWERUP_MAP_CHARS).map(([ch, powerUp]) => [
      ch,
      { kind: "powerUp", powerUp } satisfies SpawnSpec,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(PROP_MAP_CHARS).map(([ch, prop]) => [
      ch,
      { kind: "prop", prop } satisfies SpawnSpec,
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
  /** The stage that follows this one; none means the world is complete. */
  next?: string;
}

export interface Spawn {
  kind: SpawnKind;
  weapon?: WeaponId;
  powerUp?: PowerUpId;
  boss?: BossKind;
  enemy?: EnemyKind;
  prop?: PropKind;
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
