/**
 * The end of the stage: a big outflow pipe under a flashing EXIT sign. Walk
 * into its mouth to clear the stage.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { EXIT_SHEET_KEY } from "../../art/sprites/stage/stage-sheets";
import { applySheetOrigin } from "../../art/texture-registry";
import { type Rect, overlaps } from "../combat/hit-types";
import type { PropContext } from "../props/prop-context";
import type { StageEntity } from "./stage-context";

export class StageExit implements StageEntity {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private used = false;

  constructor(
    private readonly ctx: PropContext,
    readonly x: number,
    readonly y: number,
  ) {
    // Sits behind actors so Bulgo visibly walks into the pipe.
    this.sprite = ctx.scene.add.sprite(x, y, EXIT_SHEET_KEY).setDepth(12);
    applySheetOrigin(this.sprite, EXIT_SHEET_KEY);
    this.sprite.play(animationKey(EXIT_SHEET_KEY, "exit"));
  }

  /** The pipe mouth. */
  area(): Rect {
    return { x: this.x - 10, y: this.y - 26, width: 20, height: 26 };
  }

  fixedUpdate(): boolean {
    if (this.used) return true;
    const player = this.ctx.player;
    if (!player.targetable || !overlaps(this.area(), player.bodyRect())) return true;
    this.used = true;
    this.ctx.exitReached();
    return true;
  }
}
