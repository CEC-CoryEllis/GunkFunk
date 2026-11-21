/**
 * Turnip Grenadier — the artillery. Keeps its distance and lobs stink bombs
 * in true ballistic arcs at where you're standing. Get in close and it
 * panics and hops away — it's all bark and no bite up close.
 */
import { TURNIP_SHEET_KEY } from "../../art/sprites/enemies/turnip-sheet";
import { audio } from "../../audio";
import { PROJECTILES } from "../weapons/projectile-definitions";
import { lobVelocity } from "../weapons/projectile-motion";
import type { EnemyContext, EnemyStats } from "./enemy-context";
import { Enemy } from "./enemy";

const STATS: EnemyStats = {
  kind: "turnip",
  sheetKey: TURNIP_SHEET_KEY,
  maxHealth: 3,
  points: 200,
  body: { w: 14, h: 22 },
  gravity: 900,
  contactDamage: 0,
  weight: 1,
  hurtSfx: "enemy_hit",
  words: ["MASHED!", "PEELED!", "SOUPED!"],
};

const MIN_RANGE = 56;
const MAX_RANGE = 230;
const WINDUP_SECONDS = 0.45;
const THROW_SECONDS = 0.35;
const RELOAD_SECONDS = 2.1;
const PANIC_SECONDS = 0.7;
const LOB_ANGLE = 55;

type TurnipMode = "wait" | "windup" | "throw" | "panic";

export class TurnipGrenadier extends Enemy {
  private mode: TurnipMode = "wait";
  private modeTime = RELOAD_SECONDS * 0.6;

  constructor(ctx: EnemyContext, x: number, y: number) {
    super(ctx, STATS, x, y);
  }

  protected think(dt: number): void {
    this.modeTime += dt * this.speedScale;
    if (this.onGround && this.mode !== "panic") this.body.setVelocityX(0);
    switch (this.mode) {
      case "wait":
        this.play("idle");
        this.facePlayer();
        if (this.playerWithin(MIN_RANGE, 40)) this.panic();
        else if (this.modeTime > RELOAD_SECONDS && this.playerWithin(MAX_RANGE, 120))
          this.enter("windup");
        break;
      case "windup":
        this.play("windup");
        if (this.modeTime > WINDUP_SECONDS) this.throwBomb();
        break;
      case "throw":
        if (this.modeTime > THROW_SECONDS) this.enter("wait");
        break;
      case "panic":
        this.play("panic");
        if (this.modeTime > PANIC_SECONDS && this.onGround) this.enter("wait");
        break;
    }
  }

  private throwBomb(): void {
    this.enter("throw");
    this.play("throw", true);
    const handX = this.x + this.facing * 8;
    const handY = this.y - 24;
    const target = this.ctx.player.hurtbox();
    const gravity = PROJECTILES.stinkBomb.gravity;
    const velocity = lobVelocity(
      target.x + target.width / 2 - handX,
      target.y + target.height - 4 - handY,
      gravity,
      LOB_ANGLE,
    ) ?? { vx: this.facing * 120, vy: -220 };
    this.ctx.projectiles.fire({
      kind: "stinkBomb",
      x: handX,
      y: handY,
      vx: velocity.vx,
      vy: velocity.vy,
      team: "enemy",
    });
    audio.sfx.play("turnip_throw");
  }

  private panic(): void {
    this.enter("panic");
    this.ctx.fx.word("EEK!", this.x, this.y - 30, "white");
    this.body.setVelocity(-Math.sign(this.dxToPlayer() || 1) * 120, -240);
  }

  private enter(mode: TurnipMode): void {
    this.mode = mode;
    this.modeTime = 0;
  }
}
