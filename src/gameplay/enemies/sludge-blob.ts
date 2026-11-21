/**
 * Sludge Blob — the splitter. Bounces after you in little hops. Hit a big
 * blob and it bursts into two small ones; small ones pop. It's made of
 * sludge, so sludge pools don't hurt it — and it *likes* snot: Snot Blaster
 * globs heal it ("YUM!").
 */
import { BLOB_SHEET_KEY } from "../../art/sprites/enemies/blob-sheet";
import { audio } from "../../audio";
import type { HitInfo } from "../combat/hit-types";
import type { EnemyContext, EnemyStats } from "./enemy-context";
import { Enemy, type HitReaction } from "./enemy";

const BIG: EnemyStats = {
  kind: "blob",
  sheetKey: BLOB_SHEET_KEY,
  maxHealth: 3,
  points: 150,
  body: { w: 18, h: 13 },
  gravity: 900,
  contactDamage: 1,
  weight: 1.2,
  sludgeImmune: true,
  hurtSfx: "enemy_squish",
  words: ["SPLORCH!", "GLOOP!"],
};

const SMALL: EnemyStats = { ...BIG, maxHealth: 1, points: 50, body: { w: 11, h: 8 }, weight: 0.7 };

const HOP_INTERVAL = 0.9;
const HOP_SPEED_X = 70;
const HOP_SPEED_Y = 210;
const SPLIT_SPEED_X = 130;

export class SludgeBlob extends Enemy {
  private hopTimer: number;

  constructor(
    ctx: EnemyContext,
    x: number,
    y: number,
    readonly small = false,
    velocity?: { vx: number; vy: number },
  ) {
    super(ctx, small ? SMALL : BIG, x, y);
    this.hopTimer = HOP_INTERVAL * (0.5 + Math.random());
    if (velocity) this.body.setVelocity(velocity.vx, velocity.vy);
  }

  private get size(): "big" | "small" {
    return this.small ? "small" : "big";
  }

  protected override hurtAnimation(): string {
    return `${this.size}_hurt`;
  }

  protected override reactToHit(hit: HitInfo): HitReaction {
    if (hit.status !== "slimed") return "normal";
    this.health = Math.min(this.stats.maxHealth, this.health + 1);
    this.ctx.fx.word("YUM!", this.x, this.y - 22, "slime");
    audio.sfx.play("health_pickup", { pitch: 1.3, volume: 0.7 });
    return "absorbed";
  }

  /** A big blob doesn't recoil — it bursts into two small blobs. */
  protected override onDamaged(): boolean {
    if (this.small) return false;
    audio.sfx.play("blob_split");
    this.ctx.fx.splat(this.x, this.y - 6);
    this.ctx.fx.particles("slime", this.x, this.y - 8, 8);
    for (const side of [-1, 1] as const) {
      this.ctx.spawnEnemy("blob", this.x + side * 6, this.y - 2, {
        small: true,
        vx: side * SPLIT_SPEED_X,
        vy: -230,
      });
    }
    this.ctx.addScore(this.stats.points / 3, this.x, this.y - 20);
    this.remove();
    return true;
  }

  protected think(dt: number): void {
    if (!this.onGround) return;
    this.body.setVelocityX(0);
    this.play(`${this.size}_idle`);
    this.hopTimer -= dt * this.speedScale;
    if (this.hopTimer > 0 || !this.playerWithin(240, 90)) return;
    this.hopTimer = HOP_INTERVAL;
    this.facePlayer();
    this.play(`${this.size}_hop`, true);
    this.body.setVelocity(
      this.facing * HOP_SPEED_X * this.speedScale,
      -HOP_SPEED_Y * (this.small ? 0.8 : 1),
    );
    audio.sfx.play("snot_bounce", { pitch: this.small ? 1.4 : 0.9, volume: 0.4 });
  }
}
