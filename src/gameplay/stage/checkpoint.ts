/**
 * A checkpoint: a plunger stuck in the floor. Touch it and Bulgo's pennant
 * pops up; lose a life after that and you come back here. It also patches
 * Bulgo up a little.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { CHECKPOINT_SHEET_KEY } from "../../art/sprites/stage/stage-sheets";
import { applySheetOrigin } from "../../art/texture-registry";
import { audio } from "../../audio";
import { type Rect, overlaps } from "../combat/hit-types";
import type { PropContext } from "../props/prop-context";
import type { StageEntity } from "./stage-context";

const HEAL = 2;

export class Checkpoint implements StageEntity {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private reached = false;

  constructor(
    private readonly ctx: PropContext,
    readonly x: number,
    readonly y: number,
  ) {
    this.sprite = ctx.scene.add.sprite(x, y, CHECKPOINT_SHEET_KEY).setDepth(13);
    applySheetOrigin(this.sprite, CHECKPOINT_SHEET_KEY);
    this.sprite.play(animationKey(CHECKPOINT_SHEET_KEY, "idle"));
  }

  get active(): boolean {
    return this.reached;
  }

  private area(): Rect {
    return { x: this.x - 10, y: this.y - 36, width: 20, height: 36 };
  }

  fixedUpdate(): boolean {
    if (this.reached) return true;
    const player = this.ctx.player;
    if (!player.targetable || !overlaps(this.area(), player.bodyRect())) return true;
    this.reached = true;
    this.sprite.play(animationKey(CHECKPOINT_SHEET_KEY, "raise"));
    this.sprite.chain(animationKey(CHECKPOINT_SHEET_KEY, "wave"));
    audio.sfx.play("checkpoint");
    this.ctx.fx.word("CHECKPOINT!", this.x, this.y - 48, "slime");
    this.ctx.fx.particles("spark", this.x, this.y - 30, 10);
    player.heal(HEAL);
    this.ctx.checkpointReached(this.x, this.y);
    return true;
  }
}
