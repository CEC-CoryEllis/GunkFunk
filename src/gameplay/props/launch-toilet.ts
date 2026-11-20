/**
 * The launch toilet: land on the seat and a geyser flush fires Bulgo sky-high
 * (and refunds the double jump). The way up to high ledges and secrets.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { LARGE_PROP_SHEET_KEY } from "../../art/sprites/props/large-props-sheet";
import { audio } from "../../audio";
import { type Rect, overlaps } from "../combat/hit-types";
import type { StageEntity } from "../stage/stage-context";
import type { PropContext } from "./prop-context";
import { addPropSprite, playIfChanged } from "./prop-sprite";

/** ~8.5 tiles of height, a bit over twice a normal jump. */
export const TOILET_LAUNCH_SPEED = 560;
const COOLDOWN = 0.35;

export class LaunchToilet implements StageEntity {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private cooldown = 0;

  constructor(
    private readonly ctx: PropContext,
    readonly x: number,
    readonly y: number,
  ) {
    this.sprite = addPropSprite(ctx.scene, LARGE_PROP_SHEET_KEY, x, y, "toilet");
    this.sprite.on("animationcomplete", () =>
      playIfChanged(this.sprite, LARGE_PROP_SHEET_KEY, "toilet"),
    );
  }

  /** The seat: a thin band over the bowl, only triggered from above. */
  seatRect(): Rect {
    return { x: this.x - 7, y: this.y - 16, width: 20, height: 8 };
  }

  fixedUpdate(dt: number): boolean {
    this.cooldown -= dt;
    const player = this.ctx.player;
    if (this.cooldown > 0 || !player.targetable || !player.falling) return true;
    const feet = player.bodyRect();
    const feetBand: Rect = { x: feet.x, y: feet.y + feet.height - 4, width: feet.width, height: 4 };
    if (overlaps(feetBand, this.seatRect())) this.flush();
    return true;
  }

  private flush(): void {
    this.cooldown = COOLDOWN;
    this.ctx.player.launch(TOILET_LAUNCH_SPEED);
    this.sprite.play(animationKey(LARGE_PROP_SHEET_KEY, "toilet_flush"));
    audio.sfx.play("toilet_launch");
    this.ctx.fx.particles("water", this.x + 4, this.y - 14, 12);
    this.ctx.fx.word("FWOOSH!", this.x + 4, this.y - 40, "white");
  }
}
