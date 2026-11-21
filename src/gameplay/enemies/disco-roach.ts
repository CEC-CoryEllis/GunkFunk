/**
 * Disco Roach — the flyer. Hovers near its spot in a lazy figure-of-eight,
 * striking a Saturday-night pose, then dive-bombs you and climbs back up.
 * Only dangerous mid-swoop; knock it down and it tumbles like anything else.
 */
import { ROACH_SHEET_KEY } from "../../art/sprites/enemies/roach-sheet";
import { audio } from "../../audio";
import type { EnemyContext, EnemyStats } from "./enemy-context";
import { Enemy } from "./enemy";

const STATS: EnemyStats = {
  kind: "roach",
  sheetKey: ROACH_SHEET_KEY,
  maxHealth: 2,
  points: 200,
  body: { w: 18, h: 10 },
  gravity: 0,
  contactDamage: 1,
  weight: 0.8,
  hurtSfx: "roach_buzz",
  words: ["SQUISH!", "DISCO'S DEAD!", "CRUNCH!"],
};

const HOVER_RADIUS_X = 26;
const HOVER_RADIUS_Y = 8;
const SWOOP_RANGE_X = 150;
const SWOOP_SPEED = 230;
const SWOOP_MAX_SECONDS = 1.1;
const RETURN_SPEED = 90;
const SWOOP_COOLDOWN = 1.6;

type RoachMode = "hover" | "swoop" | "return";

export class DiscoRoach extends Enemy {
  private mode: RoachMode = "hover";
  private modeTime = Math.random() * SWOOP_COOLDOWN;
  private readonly homeX: number;
  private readonly homeY: number;
  private phase = Math.random() * Math.PI * 2;
  private swoopTarget = { x: 0, y: 0 };

  constructor(ctx: EnemyContext, x: number, y: number) {
    super(ctx, STATS, x, y);
    this.homeX = x;
    this.homeY = y;
  }

  protected override get contactActive(): boolean {
    return this.mode === "swoop";
  }

  protected think(dt: number): void {
    this.modeTime += dt;
    switch (this.mode) {
      case "hover":
        this.hover(dt);
        break;
      case "swoop":
        this.play("swoop");
        if (
          this.modeTime > SWOOP_MAX_SECONDS ||
          this.reached(this.swoopTarget, 6) ||
          this.onGround
        ) {
          this.enter("return");
        }
        break;
      case "return": {
        this.play("fly");
        const home = { x: this.homeX, y: this.homeY };
        this.flyToward(home, RETURN_SPEED);
        if (this.reached(home, 4)) this.enter("hover");
        break;
      }
    }
  }

  private hover(dt: number): void {
    this.phase += dt * 2 * this.speedScale;
    const target = {
      x: this.homeX + Math.sin(this.phase) * HOVER_RADIUS_X,
      y: this.homeY + Math.sin(this.phase * 2) * HOVER_RADIUS_Y,
    };
    this.body.setVelocity((target.x - this.x) * 4, (target.y - this.y) * 4);
    this.play(Math.sin(this.phase * 0.5) > 0.7 ? "disco" : "fly");
    this.facePlayer();
    const below = this.dyToPlayer() > 10;
    if (this.modeTime > SWOOP_COOLDOWN && below && this.playerWithin(SWOOP_RANGE_X, 140))
      this.swoop();
  }

  private swoop(): void {
    this.enter("swoop");
    this.swoopTarget = { x: this.ctx.player.x, y: this.ctx.player.y - 14 };
    this.flyToward(this.swoopTarget, SWOOP_SPEED * this.speedScale);
    audio.sfx.play("roach_buzz", { pitch: 1.3 });
  }

  private flyToward(target: { x: number; y: number }, speed: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const length = Math.hypot(dx, dy) || 1;
    this.body.setVelocity(
      (dx / length) * speed * this.speedScale,
      (dy / length) * speed * this.speedScale,
    );
    if (Math.abs(dx) > 2) this.facing = dx < 0 ? -1 : 1;
  }

  private reached(target: { x: number; y: number }, tolerance: number): boolean {
    return Math.hypot(target.x - this.x, target.y - this.y) <= tolerance;
  }

  private enter(mode: RoachMode): void {
    this.mode = mode;
    this.modeTime = 0;
  }
}
