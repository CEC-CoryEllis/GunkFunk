/**
 * A patch of cracked brickwork. Ordinary hits just go "TINK"; a heavy hit (a
 * combo finisher, a charged Mega Punch, an explosion, or an enemy bowled into
 * it) brings the whole patch down — usually revealing a secret.
 */
import { audio } from "../../audio";
import { TILE_SIZE } from "../../config/display";
import type { CellRegion } from "../../levels/cell-regions";
import {
  type Damageable,
  type HitInfo,
  type HitResult,
  MISSED,
  type Rect,
} from "../combat/hit-types";
import type { StageEntity } from "../stage/stage-context";
import type { PropContext } from "./prop-context";
import { breaksWall } from "./prop-rules";

const BREAK_POINTS = 100;
const TINK_COOLDOWN = 0.4;

export class CrackedWall implements Damageable, StageEntity {
  readonly team = "neutral" as const;
  private broken = false;
  private tinkCooldown = 0;

  constructor(
    private readonly ctx: PropContext,
    readonly region: CellRegion,
  ) {
    ctx.combat.register(this);
  }

  get targetable(): boolean {
    return !this.broken;
  }

  get isBroken(): boolean {
    return this.broken;
  }

  hurtbox(): Rect {
    const { minTx, minTy, maxTx, maxTy } = this.region;
    return {
      x: minTx * TILE_SIZE,
      y: minTy * TILE_SIZE,
      width: (maxTx - minTx + 1) * TILE_SIZE,
      height: (maxTy - minTy + 1) * TILE_SIZE,
    };
  }

  takeHit(hit: HitInfo): HitResult {
    if (this.broken || hit.damage <= 0) return MISSED;
    if (!breaksWall(hit)) {
      // It still connects (so combos keep chaining towards the finisher), it just doesn't give.
      this.tink(hit);
      return { applied: true, defeated: false };
    }
    this.crumble();
    return { applied: true, defeated: true };
  }

  fixedUpdate(dt: number): boolean {
    this.tinkCooldown -= dt;
    return !this.broken;
  }

  private tink(hit: HitInfo): void {
    if (this.tinkCooldown > 0) return;
    this.tinkCooldown = TINK_COOLDOWN;
    audio.sfx.play("punch_hit", { pitch: 1.8, volume: 0.6 });
    this.ctx.fx.particles("brick", hit.x, hit.y, 2);
    this.ctx.fx.word("TINK!", hit.x, hit.y - 12, "white");
  }

  private crumble(): void {
    this.broken = true;
    this.ctx.combat.unregister(this);
    this.ctx.level.breakCells(this.region.cells);
    audio.sfx.play("wall_crumble");
    this.ctx.fx.shake(0.8, 180);
    for (const cell of this.region.cells) {
      const x = cell.tx * TILE_SIZE + TILE_SIZE / 2;
      const y = cell.ty * TILE_SIZE + TILE_SIZE / 2;
      this.ctx.fx.particles("brick", x, y, 5);
      this.ctx.fx.dust(x, y + TILE_SIZE / 2);
    }
    const box = this.hurtbox();
    this.ctx.fx.word("KRUMBLE!", box.x + box.width / 2, box.y - 6, "gold");
    this.ctx.addScore(BREAK_POINTS, box.x + box.width / 2, box.y + 8);
  }
}
