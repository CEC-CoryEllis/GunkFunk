/**
 * Hyper Grease's trail. While Bulgo is greased and running along the floor he
 * drips and leaves glossy slicks behind him; any grounded enemy that steps on
 * one goes feet-up and tumbles (bowling over whatever it slides into). Slicks
 * fade after a few seconds. One trail entity lives on every stage and idles
 * until the power-up is running.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { GREASE_SHEET_KEY } from "../../art/sprites/powerups/powerup-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import { audio } from "../../audio";
import type { Rect } from "../combat/hit-types";
import type { PropContext } from "../props/prop-context";
import type { StageEntity } from "../stage/stage-context";

/** Distance run between slicks. */
export const SLICK_SPACING = 12;
export const SLICK_SECONDS = 5;
const FADE_SECONDS = 1;
const MAX_SLICKS = 48;
const DRIP_SECONDS = 0.12;
/** Slicks sit just above the floor tiles but below everything standing on them. */
const SLICK_DEPTH = 11;

interface Slick {
  sprite: Phaser.GameObjects.Sprite;
  area: Rect;
  age: number;
}

export class GreaseTrail implements StageEntity {
  private readonly slicks: Slick[] = [];
  private lastX = Number.NaN;
  private drip = 0;

  constructor(private readonly ctx: PropContext) {}

  get count(): number {
    return this.slicks.length;
  }

  fixedUpdate(dt: number): boolean {
    this.lay(dt);
    this.age(dt);
    this.tripEnemies();
    return true;
  }

  private lay(dt: number): void {
    const player = this.ctx.player;
    if (!player.greasy) {
      this.lastX = Number.NaN;
      return;
    }
    this.drip -= dt;
    if (this.drip <= 0) {
      this.drip = DRIP_SECONDS;
      this.ctx.fx.particles("grease", player.x, player.y - 16, 1);
    }
    if (!player.grounded || !this.onFloor(player.x, player.y)) return;
    if (Number.isFinite(this.lastX) && Math.abs(player.x - this.lastX) < SLICK_SPACING) return;
    this.lastX = player.x;
    this.addSlick(player.x, player.y);
  }

  /** Slicks only go down on solid floor or grates, never over gaps or hazards. */
  private onFloor(x: number, y: number): boolean {
    const below = this.ctx.level.terrainAtWorld(x, y + 2);
    return below === "solid" || below === "oneWay";
  }

  private addSlick(x: number, y: number): void {
    if (this.slicks.length >= MAX_SLICKS) this.slicks.shift()?.sprite.destroy();
    const sprite = this.ctx.scene.add.sprite(Math.round(x), Math.round(y), GREASE_SHEET_KEY);
    applySheetOrigin(sprite, GREASE_SHEET_KEY);
    sprite.play(animationKey(GREASE_SHEET_KEY, `slick${Math.floor(Math.random() * 3)}`));
    sprite.setDepth(SLICK_DEPTH).setFlipX(Math.random() < 0.5);
    this.slicks.push({ sprite, area: { x: x - 8, y: y - 6, width: 16, height: 8 }, age: 0 });
  }

  private age(dt: number): void {
    for (const slick of this.slicks) {
      slick.age += dt;
      const left = SLICK_SECONDS - slick.age;
      slick.sprite.setAlpha(Math.min(1, left / FADE_SECONDS));
    }
    while (this.slicks.length > 0 && this.slicks[0]!.age >= SLICK_SECONDS) {
      this.slicks.shift()!.sprite.destroy();
    }
  }

  private tripEnemies(): void {
    for (const slick of this.slicks) {
      for (const enemy of this.ctx.enemiesIn(slick.area)) {
        if (enemy.slip()) audio.sfx.play("slide", { pitch: 1.4 });
      }
    }
  }
}
