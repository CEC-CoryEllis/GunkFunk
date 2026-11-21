/**
 * A barrel of glowing toxic sludge. Break it and the fuse fizzes for a moment
 * before it blows, hurting everything nearby — including other barrels, whose
 * shorter fuses make chain reactions ripple down a row.
 */
import { SMALL_PROP_SHEET_KEY } from "../../art/sprites/props/small-props-sheet";
import { audio } from "../../audio";
import type { HitInfo } from "../combat/hit-types";
import { BreakableProp } from "./breakable-prop";
import { environmentBlast } from "./environment-blast";
import type { PropContext } from "./prop-context";

/** Fuse after being hit directly vs. caught in another barrel's blast. */
export const FUSE_SECONDS = 0.7;
export const CHAIN_FUSE_SECONDS = 0.22;
const BLAST = { radius: 34, damage: 3, knockback: 300 };

export class ToxicBarrel extends BreakableProp {
  private fuse = 0;

  constructor(ctx: PropContext, x: number, y: number) {
    super(
      ctx,
      {
        sheet: SMALL_PROP_SHEET_KEY,
        animation: "barrel",
        width: 14,
        height: 19,
        health: 2,
        points: 100,
      },
      x,
      y,
    );
  }

  /** Lit and about to blow. */
  get lit(): boolean {
    return this.broken && !this.finished;
  }

  protected override onDamaged(): void {
    audio.sfx.play("ball_bounce", { pitch: 0.5, volume: 0.6 });
  }

  protected override onBreak(hit: HitInfo): void {
    this.fuse = hit.kind === "explosion" ? CHAIN_FUSE_SECONDS : FUSE_SECONDS;
    this.play("barrel_fuse");
    audio.sfx.play("charge_ready", { pitch: 1.6, volume: 0.6 });
  }

  protected override step(dt: number): void {
    if (!this.lit) return;
    this.fuse -= dt;
    this.sprite.setScale(1 + Math.max(0, 0.7 - this.fuse) * 0.25);
    if (this.fuse > 0) return;
    environmentBlast(this.ctx, this.x, this.midY, BLAST);
    this.ctx.fx.splat(this.x, this.y);
    this.finished = true;
  }
}
