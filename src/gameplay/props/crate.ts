/**
 * A wooden crate. Three hits (or one big one) splinter it and a snack pops out.
 */
import { SMALL_PROP_SHEET_KEY } from "../../art/sprites/props/small-props-sheet";
import { audio } from "../../audio";
import { type HitInfo, knockbackFor } from "../combat/hit-types";
import { BreakableProp } from "./breakable-prop";
import { dropItem } from "./item-pickup";
import type { PropContext } from "./prop-context";

export class Crate extends BreakableProp {
  constructor(ctx: PropContext, x: number, y: number) {
    super(
      ctx,
      {
        sheet: SMALL_PROP_SHEET_KEY,
        animation: "crate",
        width: 16,
        height: 16,
        health: 3,
        points: 50,
      },
      x,
      y,
    );
  }

  protected override onDamaged(): void {
    this.play("crate_hit");
    audio.sfx.play("crate_break", { pitch: 1.5, volume: 0.5 });
  }

  protected override onBreak(hit: HitInfo): void {
    audio.sfx.play("crate_break");
    this.ctx.fx.particles("splinter", this.x, this.midY, 14);
    this.ctx.fx.dust(this.x, this.y);
    dropItem(this.ctx, "snack", this.x, this.midY, Math.sign(knockbackFor(hit, this.x)) * 40);
    this.finished = true;
  }
}
