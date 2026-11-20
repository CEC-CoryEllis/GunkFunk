/**
 * A dented trash can. Whack it and it tips over, spilling a surprise: a
 * snack, a gem, or an angry rat who was living in there.
 */
import { SMALL_PROP_SHEET_KEY } from "../../art/sprites/props/small-props-sheet";
import { audio } from "../../audio";
import { type HitInfo, knockbackFor } from "../combat/hit-types";
import { BreakableProp } from "./breakable-prop";
import { dropItem } from "./item-pickup";
import type { PropContext } from "./prop-context";
import { type TrashSurprise, rollSurprise } from "./prop-rules";

export class TrashCan extends BreakableProp {
  constructor(
    ctx: PropContext,
    x: number,
    y: number,
    private readonly surprise: TrashSurprise = rollSurprise(Math.random()),
  ) {
    super(
      ctx,
      {
        sheet: SMALL_PROP_SHEET_KEY,
        animation: "trash",
        width: 14,
        height: 18,
        health: 1,
        points: 25,
      },
      x,
      y,
    );
  }

  protected override onBreak(hit: HitInfo): void {
    const direction = Math.sign(knockbackFor(hit, this.x)) || 1;
    this.sprite.setFlipX(direction < 0);
    this.play("trash_tipped");
    audio.sfx.play("crate_break", { pitch: 0.7 });
    this.ctx.fx.particles("junk", this.x + direction * 8, this.y - 6, 8);
    const mouthX = this.x + direction * 10;
    if (this.surprise === "rat") {
      audio.sfx.play("rat_squeak");
      this.ctx.fx.word("SQUEAK!", mouthX, this.y - 24, "pink");
      this.ctx.spawnEnemy("rat", mouthX, this.y);
    } else {
      dropItem(this.ctx, this.surprise, mouthX, this.y - 8, direction * 70);
    }
    // The tipped can stays as scenery.
  }
}
