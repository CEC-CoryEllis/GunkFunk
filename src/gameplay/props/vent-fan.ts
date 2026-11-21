/**
 * A floor vent fan blowing a column of stale sewer air straight up. It lifts
 * Bulgo (hover by riding the top of the column) and anything else light
 * enough — enemies drift up helplessly, ready to be smacked.
 */
import type * as Phaser from "phaser";
import { LARGE_PROP_SHEET_KEY } from "../../art/sprites/props/large-props-sheet";
import { WHITE } from "../../art/palettes";
import { toPhaserColor } from "../../art/pixel/color";
import { audio } from "../../audio";
import { TILE_SIZE } from "../../config/display";
import { type Rect, overlaps } from "../combat/hit-types";
import type { StageEntity } from "../stage/stage-context";
import type { PropContext } from "./prop-context";
import { PROP_DEPTH, addPropSprite } from "./prop-sprite";

/** Column height in tiles. */
export const FAN_COLUMN_TILES = 6;
/** Upward acceleration (px/s²) at the fan; beats Bulgo's 1150 gravity comfortably. */
export const FAN_PLAYER_LIFT = 2300;
const FAN_ENEMY_LIFT = 2000;
/** The wind weakens with height, down to this fraction at the top of the column. */
const TOP_STRENGTH = 0.5;
const HALF_WIDTH = 13;
const STREAKS = 7;
const STREAK_SPEED = 150;
const AIR = toPhaserColor(WHITE);

export class VentFan implements StageEntity {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly air: Phaser.GameObjects.Graphics;
  private readonly streaks: { dx: number; rise: number }[] = [];
  private playerInside = false;

  constructor(
    private readonly ctx: PropContext,
    readonly x: number,
    readonly y: number,
  ) {
    this.sprite = addPropSprite(ctx.scene, LARGE_PROP_SHEET_KEY, x, y, "fan");
    this.air = ctx.scene.add.graphics().setDepth(PROP_DEPTH + 1);
    const height = FAN_COLUMN_TILES * TILE_SIZE;
    for (let i = 0; i < STREAKS; i++) {
      this.streaks.push({
        dx: (i / (STREAKS - 1) - 0.5) * HALF_WIDTH * 1.6,
        rise: (i * height * 0.37) % height,
      });
    }
  }

  /** The updraft: the full width of the fan, six tiles up. */
  column(): Rect {
    const height = FAN_COLUMN_TILES * TILE_SIZE;
    return { x: this.x - HALF_WIDTH, y: this.y - height, width: HALF_WIDTH * 2, height };
  }

  fixedUpdate(dt: number): boolean {
    const area = this.column();
    const player = this.ctx.player;
    const body = player.bodyRect();
    const inside = player.targetable && overlaps(area, body);
    if (inside) player.addLift(FAN_PLAYER_LIFT * this.strengthAt(body.y + body.height));
    if (inside && !this.playerInside) audio.sfx.play("fan_whoosh", { volume: 0.7 });
    this.playerInside = inside;
    for (const target of this.ctx.enemiesIn(area)) {
      const box = target.hurtbox();
      target.applyLift(FAN_ENEMY_LIFT * this.strengthAt(box.y + box.height), dt);
    }
    this.drawAir(dt, area);
    return true;
  }

  /** Wind strength (0..1] for something whose feet are at `bottom`: it tapers so things hover near the top. */
  private strengthAt(bottom: number): number {
    const height = FAN_COLUMN_TILES * TILE_SIZE;
    const rise = Math.min(1, Math.max(0, (this.y - bottom) / height));
    return 1 - (1 - TOP_STRENGTH) * rise;
  }

  /** Faint streaks rushing up the column so you can see where the wind is. */
  private drawAir(dt: number, area: Rect): void {
    this.air.clear();
    for (const streak of this.streaks) {
      streak.rise = (streak.rise + STREAK_SPEED * dt) % area.height;
      const fade = 1 - streak.rise / area.height;
      this.air.fillStyle(AIR, 0.45 * fade);
      this.air.fillRect(Math.round(this.x + streak.dx), Math.round(this.y - 8 - streak.rise), 1, 6);
    }
  }
}
