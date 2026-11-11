/**
 * The Phaser-side representation of a stage: tilemap layer with autotiled
 * terrain, one-way platforms, animated hazards, and world-space terrain
 * queries used by entities (ladders, hazards, ceilings).
 */
import * as Phaser from "phaser";
import { TILESET_KEYS } from "../art/texture-registry";
import { INTERIOR_VARIANTS, TILE } from "../art/tiles/tile-ids";
import { animationKey } from "../art/pixel/sprite-sheet";
import { TILE_SIZE } from "../config/display";
import type { LevelDefinition, ParsedLevel, TerrainKind } from "./level-format";
import { horizontalRuns, parseLevel, solidMask, terrainAt } from "./level-parser";

const EMPTY_TILE = -1;

function hash2(x: number, y: number): number {
  const h = Math.imul((x * 73856093) ^ (y * 19349663), 2654435761);
  return (h >>> 0) / 4294967296;
}

export class LevelWorld {
  readonly parsed: ParsedLevel;
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  readonly widthPx: number;
  readonly heightPx: number;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly definition: LevelDefinition,
  ) {
    this.parsed = parseLevel(definition);
    this.widthPx = this.parsed.widthTiles * TILE_SIZE;
    this.heightPx = this.parsed.heightTiles * TILE_SIZE;
    this.layer = this.buildTilemap();
    this.buildHazardSprites();
  }

  private tileIndexFor(tx: number, ty: number): number {
    const kind = terrainAt(this.parsed, tx, ty);
    switch (kind) {
      case "solid": {
        const mask = solidMask(this.parsed, tx, ty);
        if (mask === 15 && hash2(tx, ty) > 0.8) {
          return TILE.brickInterior + Math.floor(hash2(ty, tx) * INTERIOR_VARIANTS);
        }
        return TILE.brickBase + mask;
      }
      case "oneWay":
        return TILE.grate;
      case "ladder":
        return terrainAt(this.parsed, tx, ty - 1) === "ladder" ? TILE.ladder : TILE.ladderTop;
      case "spikes":
        return TILE.spikes;
      default:
        return EMPTY_TILE;
    }
  }

  private buildTilemap(): Phaser.Tilemaps.TilemapLayer {
    const { widthTiles, heightTiles } = this.parsed;
    const data: number[][] = [];
    for (let ty = 0; ty < heightTiles; ty++) {
      const row: number[] = [];
      for (let tx = 0; tx < widthTiles; tx++) row.push(this.tileIndexFor(tx, ty));
      data.push(row);
    }
    const map = this.scene.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(
      TILESET_KEYS.sewer,
      TILESET_KEYS.sewer,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
    )!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.forEachTile((tile) => {
      const kind = terrainAt(this.parsed, tile.x, tile.y);
      if (kind === "solid") {
        tile.setCollision(true, true, true, true);
      } else if (kind === "oneWay" || (kind === "ladder" && tile.index === TILE.ladderTop)) {
        // Only the top face is solid: jump up through, stand on top, drop through with down+jump.
        tile.setCollision(false, false, true, false);
      }
    });
    layer.setDepth(10);
    return layer;
  }

  private buildHazardSprites(): void {
    for (const run of horizontalRuns(this.parsed, "sludge")) {
      for (let i = 0; i < run.length; i++) {
        const tx = run.tx + i;
        const isSurface = terrainAt(this.parsed, tx, run.ty - 1) !== "sludge";
        const sprite = this.scene.add
          .sprite(tx * TILE_SIZE, run.ty * TILE_SIZE, "sludge")
          .setOrigin(0, 0)
          .setDepth(12);
        sprite.play({
          key: animationKey("sludge", isSurface ? "surface" : "body"),
          startFrame: (tx * 2) % 6,
        });
      }
    }
  }

  /** Arcade collision filter: one-way tiles are ignored while dropping through or when below their top. */
  isOneWayTile(tile: Phaser.Tilemaps.Tile): boolean {
    return tile.index === TILE.grate || tile.index === TILE.ladderTop;
  }

  terrainAtWorld(x: number, y: number): TerrainKind {
    return terrainAt(this.parsed, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  /** True if any of the sampled points inside the rectangle touches the given terrain. */
  rectTouches(rect: Phaser.Geom.Rectangle, kind: TerrainKind): boolean {
    for (let y = rect.top + 1; y < rect.bottom; y += TILE_SIZE / 2) {
      for (let x = rect.left + 1; x < rect.right; x += TILE_SIZE / 2) {
        if (this.terrainAtWorld(x, y) === kind) return true;
      }
      if (this.terrainAtWorld(rect.right - 1, y) === kind) return true;
    }
    return this.terrainAtWorld(rect.centerX, rect.bottom - 1) === kind;
  }

  ladderCenterNear(x: number, y: number): number | undefined {
    if (this.terrainAtWorld(x, y) !== "ladder") return undefined;
    return Math.floor(x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  }

  playerStartWorld(): { x: number; y: number } {
    const { tx, ty } = this.parsed.playerStart;
    return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: (ty + 1) * TILE_SIZE };
  }
}
