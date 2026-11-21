/**
 * Sewer Rat — the grunt. Patrols back and forth, rears up when it spots you,
 * then charges. A quarter of the time it trips over its own feet and
 * faceplants, leaving itself wide open.
 */
import { RAT_SHEET_KEY } from "../../art/sprites/enemies/rat-sheet";
import { audio } from "../../audio";
import type { EnemyContext, EnemyStats } from "./enemy-context";
import { Enemy } from "./enemy";

const STATS: EnemyStats = {
  kind: "rat",
  sheetKey: RAT_SHEET_KEY,
  maxHealth: 2,
  points: 100,
  body: { w: 18, h: 12 },
  gravity: 900,
  contactDamage: 1,
  weight: 0.9,
  hurtSfx: "rat_squeak",
  words: ["SQUEAK!", "EEP!", "SPLAT!"],
};

const PATROL_SPEED = 38;
const CHARGE_SPEED = 165;
const SIGHT_X = 130;
const SIGHT_Y = 28;
const ALERT_SECONDS = 0.45;
const CHARGE_SECONDS = 1.3;
const TRIP_CHANCE = 0.25;
const TRIP_SECONDS = 1.1;
const COOLDOWN_SECONDS = 1;

type RatMode = "patrol" | "alert" | "charge" | "trip" | "cooldown";

export class SewerRat extends Enemy {
  private mode: RatMode = "patrol";
  private modeTime = 0;
  private tripAt = -1;

  constructor(
    ctx: EnemyContext,
    x: number,
    y: number,
    private readonly random: () => number = Math.random,
  ) {
    super(ctx, STATS, x, y);
  }

  protected think(dt: number): void {
    this.modeTime += dt;
    switch (this.mode) {
      case "patrol":
      case "cooldown":
        this.patrol();
        if (this.mode === "cooldown" && this.modeTime > COOLDOWN_SECONDS) this.enter("patrol");
        if (this.mode === "patrol" && this.playerWithin(SIGHT_X, SIGHT_Y)) this.spot();
        break;
      case "alert":
        this.body.setVelocityX(0);
        if (this.modeTime > ALERT_SECONDS) {
          this.enter("charge");
          this.tripAt = this.random() < TRIP_CHANCE ? 0.3 + this.random() * 0.5 : -1;
        }
        break;
      case "charge":
        this.play("charge");
        this.body.setVelocityX(this.facing * CHARGE_SPEED * this.speedScale);
        if (this.tripAt > 0 && this.modeTime > this.tripAt) this.trip();
        else if (this.modeTime > CHARGE_SECONDS || this.blockedAhead()) this.enter("cooldown");
        break;
      case "trip":
        this.body.setVelocityX(this.body.velocity.x * 0.9);
        if (this.modeTime > TRIP_SECONDS) this.enter("cooldown");
        break;
    }
  }

  private patrol(): void {
    this.play("walk");
    if (this.blockedAhead()) this.facing = this.facing === 1 ? -1 : 1;
    this.body.setVelocityX(this.facing * PATROL_SPEED * this.speedScale);
  }

  private spot(): void {
    this.facePlayer();
    this.enter("alert");
    this.play("alert", true);
    audio.sfx.play("rat_squeak", { pitch: 1.3 });
    this.ctx.fx.word("!", this.x, this.y - 24, "gold");
  }

  private trip(): void {
    this.enter("trip");
    this.play("trip", true);
    this.ctx.fx.dust(this.x + this.facing * 8, this.y);
    this.ctx.fx.word("OOF!", this.x, this.y - 22, "white");
    audio.sfx.play("land", { pitch: 1.5 });
  }

  private enter(mode: RatMode): void {
    this.mode = mode;
    this.modeTime = 0;
  }

  /** Faceplanted rats are harmless to touch. */
  protected override get contactActive(): boolean {
    return this.mode !== "trip";
  }
}
