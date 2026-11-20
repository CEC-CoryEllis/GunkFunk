/**
 * The Snack-O-Matic. Each whack shakes a snack loose; break it and it topples
 * over away from the hit, crushing anything (enemies, the player, crates) in
 * the way, then spills its jackpot.
 */
import { LARGE_PROP_SHEET_KEY } from "../../art/sprites/props/large-props-sheet";
import { audio } from "../../audio";
import { presentHit } from "../combat/hit-feedback";
import { type HitInfo, type Rect, knockbackFor } from "../combat/hit-types";
import { BreakableProp } from "./breakable-prop";
import { dropItem } from "./item-pickup";
import type { PropContext } from "./prop-context";

const MAX_HEALTH = 6;
const SNACKS_TO_DISPENSE = 3;
const TOPPLE_MS = 380;
/** The case is 26 px wide and 44 px tall in its 32×48 frame. */
const CASE = { width: 26, height: 44, frameWidth: 32, frameHeight: 48, left: 3 };
const WRECK_SECONDS = 4;

let crushSerial = 0;

export class VendingMachine extends BreakableProp {
  private dispensed = 0;
  private wreckTimer = -1;

  constructor(ctx: PropContext, x: number, y: number) {
    super(
      ctx,
      {
        sheet: LARGE_PROP_SHEET_KEY,
        animation: "vending",
        width: CASE.width,
        height: CASE.height,
        health: MAX_HEALTH,
        points: 300,
      },
      x,
      y,
    );
  }

  protected override onDamaged(hit: HitInfo): void {
    audio.sfx.play("vending_clunk");
    if (this.health <= MAX_HEALTH / 2) this.play("vending_cracked");
    if (this.dispensed < SNACKS_TO_DISPENSE) {
      this.dispensed++;
      const away = Math.sign(knockbackFor(hit, this.x)) || 1;
      dropItem(this.ctx, "snack", this.x - 2, this.y - 6, away * 50);
    }
  }

  protected override onBreak(hit: HitInfo): void {
    const direction = Math.sign(knockbackFor(hit, this.x)) || 1;
    this.topple(direction);
  }

  protected override step(dt: number): void {
    if (this.wreckTimer < 0) return;
    this.wreckTimer -= dt;
    if (this.wreckTimer < 1) this.sprite.setAlpha(Math.max(0, this.wreckTimer));
    if (this.wreckTimer <= 0) this.finished = true;
  }

  /** Pivots over its bottom corner on the falling side, then lands with a crunch. */
  private topple(direction: number): void {
    audio.sfx.play("vending_clunk", { pitch: 0.7 });
    this.sprite.anims.stop();
    const corner = direction > 0 ? CASE.left + CASE.width : CASE.left;
    this.sprite.setOrigin(corner / CASE.frameWidth, 1 - 1 / CASE.frameHeight);
    this.sprite.x = this.x - CASE.frameWidth / 2 + corner;
    this.ctx.scene.tweens.add({
      targets: this.sprite,
      angle: 90 * direction,
      duration: TOPPLE_MS,
      ease: "Quad.In",
      onComplete: () => this.land(direction),
    });
  }

  private land(direction: number): void {
    const pivotX = this.sprite.x;
    const crush: Rect = {
      x: direction > 0 ? pivotX : pivotX - CASE.height,
      y: this.y - CASE.width,
      width: CASE.height,
      height: CASE.width,
    };
    const hit: HitInfo = {
      key: `vending-crush-${++crushSerial}`,
      team: "environment",
      kind: "launched",
      damage: 4,
      knockbackX: direction * 220,
      knockbackY: -260,
      x: pivotX + direction * CASE.height * 0.6,
      y: this.y - 10,
      impact: 1,
    };
    for (const outcome of this.ctx.combat.strike(crush, hit)) {
      presentHit(this.ctx.fx, hit, outcome.result, ["CRUNCH!", "FLATTENED!"]);
    }
    audio.sfx.play("vending_crash");
    this.ctx.fx.shake(1, 220);
    this.ctx.fx.word("KER-RASH!", hit.x, this.y - 30, "gold");
    const landX = pivotX + direction * CASE.height * 0.5;
    this.ctx.fx.particles("junk", landX, this.y - 8, 14);
    this.ctx.fx.dust(landX, this.y);
    dropItem(this.ctx, "feast", landX, this.y - 20, direction * 60);
    dropItem(this.ctx, "snack", landX, this.y - 20, direction * 120);
    this.wreckTimer = WRECK_SECONDS;
  }
}
