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
import type { Rect } from "../gameplay/combat/hit-types";
import type { Cell } from "./cell-regions";
import type { LevelDefinition, ParsedLevel, TerrainKind } from "./level-format";
import { horizontalRuns, parseLevel, secretCells, solidMaskWhere, terrainAt } from "./level-parser";

export type Hazard = "sludge" | "spikes";

const EMPTY_TILE = -1;
/** Secret covers draw over actors (player 20) and items (18). */
const COVER_DEPTH = 30;

function hash2(x: number, y: number): number {
  const h = Math.imul((x * 73856093) ^ (y * 19349663), 2654435761);
  return (h >>> 0) / 4294967296;
}

export class LevelWorld {
  readonly parsed: ParsedLevel;
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  readonly widthPx: number;
  readonly heightPx: number;
  /** Solid cells that heavy hits can smash (marked `%`). */
  private readonly cracked = new Set<string>();
  /** Secret-area cells: drawn as brick by their covers, so neighbours autotile as if they were solid. */
  private readonly hidden = new Set<string>();
  private map!: Phaser.Tilemaps.Tilemap;
  private tileset!: Phaser.Tilemaps.Tileset;
  private coverCount = 0;
  /** Sludge surface sprites by cell, so flooded cells can be restored. */
  private readonly sludgeSprites = new Map<string, Phaser.GameObjects.Sprite>();

  constructor(
    private readonly scene: Phaser.Scene,
    readonly definition: LevelDefinition,
  ) {
    this.parsed = parseLevel(definition);
    for (const s of this.parsed.spawns)
      if (s.kind === "crackedWall") this.cracked.add(`${s.tx},${s.ty}`);
    for (const c of secretCells(this.parsed)) this.hidden.add(`${c.tx},${c.ty}`);
    this.widthPx = this.parsed.widthTiles * TILE_SIZE;
    this.heightPx = this.parsed.heightTiles * TILE_SIZE;
    this.layer = this.buildTilemap();
    this.buildHazardSprites();
  }

  private tileIndexFor(tx: number, ty: number): number {
    const kind = terrainAt(this.parsed, tx, ty);
    switch (kind) {
      case "solid":
        return this.brickIndexFor(tx, ty);
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

  /** Autotiled brick for a cell, treating secret areas as solid so nothing gives them away. */
  private brickIndexFor(tx: number, ty: number): number {
    const mask = solidMaskWhere(
      (x, y) => terrainAt(this.parsed, x, y) === "solid" || this.hidden.has(`${x},${y}`),
      tx,
      ty,
    );
    if (this.cracked.has(`${tx},${ty}`)) return TILE.crackedBase + mask;
    if (mask === 15 && hash2(tx, ty) > 0.8) {
      return TILE.brickInterior + Math.floor(hash2(ty, tx) * INTERIOR_VARIANTS);
    }
    return TILE.brickBase + mask;
  }

  /**
   * A fake-brick layer over a secret area, drawn in front of everything until
   * the player steps inside (the owner fades it).
   */
  createSecretCover(cells: readonly Cell[]): Phaser.Tilemaps.TilemapLayer {
    const layer = this.map.createBlankLayer(`secret-cover-${++this.coverCount}`, this.tileset)!;
    for (const { tx, ty } of cells) layer.putTileAt(this.brickIndexFor(tx, ty), tx, ty);
    return layer.setDepth(COVER_DEPTH);
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
    this.map = map;
    const tileset = map.addTilesetImage(
      TILESET_KEYS.sewer,
      TILESET_KEYS.sewer,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
    )!;
    this.tileset = tileset;
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
      for (let i = 0; i < run.length; i++) this.addSludgeSprite(run.tx + i, run.ty);
    }
  }

  private addSludgeSprite(tx: number, ty: number): void {
    const isSurface = terrainAt(this.parsed, tx, ty - 1) !== "sludge";
    this.sludgeSprites.get(`${tx},${ty}`)?.destroy();
    const sprite = this.scene.add
      .sprite(tx * TILE_SIZE, ty * TILE_SIZE, "sludge")
      .setOrigin(0, 0)
      .setDepth(12);
    sprite.play({
      key: animationKey("sludge", isSurface ? "surface" : "body"),
      startFrame: (tx * 2) % 6,
    });
    this.sludgeSprites.set(`${tx},${ty}`, sprite);
  }

  /**
   * Floods cells with sludge (a boss caving the floor in): the bricks go, the
   * sludge comes up, and the neighbours re-autotile around the new pool.
   */
  flood(cells: readonly Cell[]): void {
    this.breakCells(cells);
    for (const { tx, ty } of cells) {
      this.parsed.terrain[ty]![tx] = "sludge";
      this.addSludgeSprite(tx, ty);
    }
  }

  /**
   * Smashes cracked cells: they become empty, and the surrounding bricks are
   * re-autotiled so new edges get their slime caps and outlines.
   */
  breakCells(cells: readonly Cell[]): void {
    for (const { tx, ty } of cells) {
      this.parsed.terrain[ty]![tx] = "empty";
      this.cracked.delete(`${tx},${ty}`);
      this.layer.removeTileAt(tx, ty);
    }
    const touched = new Set<string>();
    for (const { tx, ty } of cells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) touched.add(`${tx + dx},${ty + dy}`);
      }
    }
    for (const key of touched) {
      const [tx, ty] = key.split(",").map(Number) as [number, number];
      if (terrainAt(this.parsed, tx, ty) !== "solid" || tx < 0 || ty < 0) continue;
      if (tx >= this.parsed.widthTiles || ty >= this.parsed.heightTiles) continue;
      const tile = this.layer.putTileAt(this.tileIndexFor(tx, ty), tx, ty);
      tile.setCollision(true, true, true, true);
    }
  }

  /**
   * Puts cells back the way the map drew them (a boss fight resets after
   * smashing grates or flooding the floor).
   */
  restoreCells(cells: readonly Cell[], kind: TerrainKind): void {
    for (const { tx, ty } of cells) {
      this.parsed.terrain[ty]![tx] = kind;
      this.sludgeSprites.get(`${tx},${ty}`)?.destroy();
      this.sludgeSprites.delete(`${tx},${ty}`);
    }
    for (const { tx, ty } of cells) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) this.refreshTile(tx + dx, ty + dy);
      }
    }
  }

  private refreshTile(tx: number, ty: number): void {
    if (tx < 0 || ty < 0 || tx >= this.parsed.widthTiles || ty >= this.parsed.heightTiles) return;
    const index = this.tileIndexFor(tx, ty);
    if (index === EMPTY_TILE) {
      this.layer.removeTileAt(tx, ty);
      return;
    }
    const tile = this.layer.putTileAt(index, tx, ty);
    const kind = terrainAt(this.parsed, tx, ty);
    if (kind === "solid") tile.setCollision(true, true, true, true);
    else if (kind === "oneWay") tile.setCollision(false, false, true, false);
  }

  /**
   * Makes cells solid (or empty again) without touching how the map looks:
   * boss-arena gates draw their own bars over invisible blocking tiles.
   */
  setBlocking(cells: readonly Cell[], blocking: boolean): void {
    for (const { tx, ty } of cells) {
      this.parsed.terrain[ty]![tx] = blocking ? "solid" : "empty";
      if (!blocking) {
        this.layer.removeTileAt(tx, ty);
        continue;
      }
      const tile = this.layer.putTileAt(TILE.brickBase + 15, tx, ty);
      tile.setCollision(true, true, true, true);
      tile.setVisible(false);
    }
  }

  isCracked(tx: number, ty: number): boolean {
    return this.cracked.has(`${tx},${ty}`);
  }

  /** Arcade collision filter: one-way tiles are ignored while dropping through or when below their top. */
  isOneWayTile(tile: Phaser.Tilemaps.Tile): boolean {
    return tile.index === TILE.grate || tile.index === TILE.ladderTop;
  }

  terrainAtWorld(x: number, y: number): TerrainKind {
    return terrainAt(this.parsed, Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  /** True if any of the sampled points inside the rectangle touches the given terrain. */
  rectTouches(rect: Rect, kind: TerrainKind): boolean {
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;
    for (let y = rect.y + 1; y < bottom; y += TILE_SIZE / 2) {
      for (let x = rect.x + 1; x < right; x += TILE_SIZE / 2) {
        if (this.terrainAtWorld(x, y) === kind) return true;
      }
      if (this.terrainAtWorld(right - 1, y) === kind) return true;
    }
    return this.terrainAtWorld(rect.x + rect.width / 2, bottom - 1) === kind;
  }

  /** The hazard (if any) touching a rectangle — usually an entity's feet. Sludge wins ties. */
  hazardAt(rect: Rect): Hazard | null {
    if (this.rectTouches(rect, "sludge")) return "sludge";
    if (this.rectTouches(rect, "spikes")) return "spikes";
    return null;
  }

  /**
   * Arcade collision filter shared by every body: solid tiles always collide;
   * one-way tiles (grates, ladder tops) only when the body falls onto them from
   * above and isn't deliberately dropping through.
   */
  allowsTileCollision(
    body: Phaser.Physics.Arcade.Body,
    tile: Phaser.Tilemaps.Tile,
    droppingThrough = false,
  ): boolean {
    if (!this.isOneWayTile(tile)) return true;
    if (droppingThrough) return false;
    return body.velocity.y >= 0 && body.prev.y + body.height <= tile.pixelY + 4;
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
