/**
 * Builds interactive props from the level's spawn markers. Single-cell props
 * stand on the floor of their cell; cracked walls and secret areas are grouped
 * into connected regions; platforms pair up with their `:` stops.
 */
import { TILE_SIZE } from "../../config/display";
import { type Cell, groupCells } from "../../levels/cell-regions";
import type { ParsedLevel, Spawn } from "../../levels/level-format";
import { secretCells } from "../../levels/level-parser";
import type { StageEntity } from "../stage/stage-context";
import { CrackedWall } from "./cracked-wall";
import { Crate } from "./crate";
import { Hydrant } from "./hydrant";
import { ItemPickup } from "./item-pickup";
import { LaunchToilet } from "./launch-toilet";
import { MovingPlatform } from "./moving-platform";
import { platformPath } from "./platform-path";
import type { PropContext } from "./prop-context";
import type { PropKind } from "./prop-kinds";
import { SecretZone } from "./secret-zone";
import { ToxicBarrel } from "./toxic-barrel";
import { TrashCan } from "./trash-can";
import { VendingMachine } from "./vending-machine";
import { VentFan } from "./vent-fan";

/** Kinds that stand alone (platforms need their stops and are built separately). */
export type SingleProp = Exclude<PropKind, "platform">;

/** Creates one prop standing on the floor at world (x, y). Items float at that height. */
export function createProp(kind: SingleProp, ctx: PropContext, x: number, y: number): StageEntity {
  switch (kind) {
    case "crate":
      return new Crate(ctx, x, y);
    case "barrel":
      return new ToxicBarrel(ctx, x, y);
    case "launchToilet":
      return new LaunchToilet(ctx, x, y);
    case "vending":
      return new VendingMachine(ctx, x, y);
    case "hydrant":
      return new Hydrant(ctx, x, y);
    case "fan":
      return new VentFan(ctx, x, y);
    case "trashCan":
      return new TrashCan(ctx, x, y);
    case "snack":
    case "gem":
      return new ItemPickup(ctx, kind, x, y - TILE_SIZE / 2, null);
  }
}

const cellsOf = (spawns: readonly Spawn[], match: (s: Spawn) => boolean): Cell[] =>
  spawns.filter(match).map(({ tx, ty }) => ({ tx, ty }));

export function spawnProps(ctx: PropContext, level: ParsedLevel): StageEntity[] {
  const entities: StageEntity[] = [];
  for (const spawn of level.spawns) {
    if (spawn.kind !== "prop" || !spawn.prop || spawn.prop === "platform") continue;
    const x = spawn.tx * TILE_SIZE + TILE_SIZE / 2;
    entities.push(createProp(spawn.prop, ctx, x, (spawn.ty + 1) * TILE_SIZE));
  }
  for (const region of groupCells(cellsOf(level.spawns, (s) => s.kind === "crackedWall"))) {
    entities.push(new CrackedWall(ctx, region));
  }
  for (const region of groupCells(secretCells(level))) {
    entities.push(new SecretZone(ctx, region));
  }
  const stops = cellsOf(level.spawns, (s) => s.kind === "platformStop");
  for (const region of groupCells(cellsOf(level.spawns, (s) => s.prop === "platform"))) {
    const path = platformPath(region, stops);
    if (path) entities.push(new MovingPlatform(ctx, path));
  }
  return entities;
}
