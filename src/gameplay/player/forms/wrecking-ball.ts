/**
 * The Wrecking Ball form. Bulgo puffs up (his own `inflate` animation), pops
 * into a ball, and rolls over everything: anything the ball touches at speed
 * is bowled over as a launched hit, rolling hard into cracked walls smashes
 * them, a ground pound sends out a shockwave, and spikes and sludge just
 * bounce it. Explosions pop it early. When time's up it deflates, and the
 * player entity swaps Bulgo's own sprite and body back in.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../../art/pixel/sprite-sheet";
import { BALL_SHEET_KEY } from "../../../art/sprites/bulgo/ball-sheet";
import { applySheetOrigin, getSheetInfo } from "../../../art/texture-registry";
import { audio } from "../../../audio";
import type { ActionSnapshot } from "../../../core/input/actions";
import { presentHit } from "../../combat/hit-feedback";
import { type HitInfo, type Rect, rectAround } from "../../combat/hit-types";
import type { StageContext } from "../../stage/stage-context";
import { readSensors } from "../player-sensors";
import { type BallOutput, BallController } from "./ball-controller";

export type BallPhase = "inflating" | "rolling" | "deflating";

const INFLATE_SECONDS = 0.6;
const DEFLATE_SECONDS = 0.45;
const BODY_SIZE = 26;
/** Rolling faster than this bowls things over. */
const STRIKE_SPEED = 120;
/** ...and faster than this hits hard enough to smash cracked walls. */
const SMASH_SPEED = 250;
const STRIKE_KEY_SECONDS = 0.3;
const HAZARD_BOUNCE = 380;
const ROLL_WORDS = ["BOWLED!", "STRIKE!", "SPLAT!", "FLATTENED!"];

let strikeSerial = 0;

export class WreckingBall {
  readonly controller = new BallController();
  private phaseState: BallPhase | null = null;
  private timer = 0;
  private squash = 0;
  private strikeKey = "";
  private strikeAge = 0;

  constructor(
    private readonly ctx: StageContext,
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private readonly body: Phaser.Physics.Arcade.Body,
    private readonly bulgoSheet: string,
  ) {}

  get phase(): BallPhase | null {
    return this.phaseState;
  }

  get active(): boolean {
    return this.phaseState !== null;
  }

  /** Inflating and deflating are brief invulnerable transitions. */
  get transitioning(): boolean {
    return this.phaseState === "inflating" || this.phaseState === "deflating";
  }

  begin(): void {
    if (this.phaseState) return;
    this.phaseState = "inflating";
    this.timer = INFLATE_SECONDS;
    this.body.setVelocity(0, 0);
    this.sprite.play(animationKey(this.bulgoSheet, "inflate"));
    audio.sfx.play("transform_inflate");
  }

  /** Time's up (or popped): deflate, then hand Bulgo back. */
  end(popped: boolean): void {
    if (this.phaseState === null || this.phaseState === "deflating") return;
    if (this.phaseState === "inflating") {
      this.phaseState = null;
      return;
    }
    this.phaseState = "deflating";
    this.timer = DEFLATE_SECONDS;
    this.sprite.anims.timeScale = 1;
    this.sprite.play(animationKey(BALL_SHEET_KEY, "deflate"));
    audio.sfx.play("transform_inflate", { pitch: popped ? 1.6 : 0.6 });
    this.ctx.fx.word(popped ? "POP!" : "PFFFT!", this.sprite.x, this.sprite.y - 34, "white");
    if (popped) this.ctx.fx.burst(this.sprite.x, this.sprite.y - 12);
  }

  /** Drops the form immediately (death, respawn). */
  cancel(): void {
    this.phaseState = null;
    this.sprite.anims.timeScale = 1;
  }

  launch(speed: number): void {
    this.controller.launch(speed);
  }

  addLift(acceleration: number): void {
    this.controller.addLift(acceleration);
  }

  /**
   * Runs one fixed step. Returns true when the form has finished deflating
   * and the player should restore Bulgo's own sprite and body.
   */
  update(input: ActionSnapshot, dt: number): boolean {
    this.timer -= dt;
    switch (this.phaseState) {
      case "inflating":
        this.body.setVelocity(0, 0);
        if (this.timer <= 0) this.popIntoBall();
        return false;
      case "deflating":
        this.body.setVelocity(
          this.body.velocity.x * 0.85,
          Math.min(this.body.velocity.y + 20, 300),
        );
        if (this.timer > 0) return false;
        this.phaseState = null;
        return true;
      case "rolling":
        this.roll(input, dt);
        return false;
      default:
        return false;
    }
  }

  private popIntoBall(): void {
    this.phaseState = "rolling";
    this.sprite.setTexture(BALL_SHEET_KEY);
    applySheetOrigin(this.sprite, BALL_SHEET_KEY);
    const info = getSheetInfo(BALL_SHEET_KEY);
    this.body.setSize(BODY_SIZE, BODY_SIZE, false);
    this.body.setOffset(info.originX - BODY_SIZE / 2, info.originY - BODY_SIZE);
    this.controller.reset(0, 0, this.sprite.flipX ? -1 : 1);
    this.sprite.play(animationKey(BALL_SHEET_KEY, "inflate"));
    this.squash = 0.35;
    audio.sfx.play("ball_bounce", { pitch: 0.7 });
    this.ctx.fx.burst(this.sprite.x, this.sprite.y - 12);
    this.ctx.fx.word("BOING!", this.sprite.x, this.sprite.y - 36, "slime");
  }

  private roll(input: ActionSnapshot, dt: number): void {
    const sensors = readSensors(this.body, this.ctx.level, BODY_SIZE);
    const out = this.controller.update(
      { moveX: input.moveX, jumpPressed: input.pressed.jump, downPressed: input.pressed.down },
      sensors,
      dt,
    );
    this.body.setVelocity(out.vx, out.vy);
    this.react(out);
    this.checkHazards();
    this.strike(out, dt);
    this.animate(out, dt);
  }

  private react(out: BallOutput): void {
    const { x, y } = this.sprite;
    for (const event of out.events) {
      if (event === "jump") audio.sfx.play("ball_bounce", { pitch: 1.3, volume: 0.7 });
      if (event === "bounce" || event === "wallBounce") {
        this.squash = 0.17;
        audio.sfx.play("ball_bounce", { volume: Math.min(1, out.impactSpeed / 400) });
        if (out.impactSpeed > 300) this.ctx.fx.shake(0.4);
        this.ctx.fx.dust(x, y, event === "wallBounce" && out.vx > 0);
      }
      if (event === "slamStart") audio.sfx.play("punch_whoosh", { pitch: 0.6 });
      if (event === "slamLand") this.shockwave();
    }
  }

  /** Ground pound landing: a radial blast along the floor. */
  private shockwave(): void {
    const { x, y } = this.sprite;
    const hit: HitInfo = {
      key: `ball-slam-${++strikeSerial}`,
      team: "player",
      kind: "explosion",
      damage: 3,
      knockbackX: 280,
      knockbackY: -280,
      x,
      y: y - 6,
      impact: 1,
      radial: true,
      sfx: "ball_smash",
    };
    audio.sfx.play("ball_smash");
    this.squash = 0.2;
    this.ctx.fx.shake(0.9, 180);
    this.ctx.fx.hitStop(70);
    this.ctx.fx.dust(x - 14, y, true);
    this.ctx.fx.dust(x + 14, y);
    this.ctx.fx.word("KA-THOOM!", x, y - 40, "gold");
    for (const outcome of this.ctx.combat.strike(rectAround(x, y - 10, 42, 14), hit)) {
      presentHit(this.ctx.fx, hit, outcome.result);
    }
  }

  /** Spikes and sludge can't hurt a rubber ball: it just bounces off. */
  private checkHazards(): void {
    const feet: Rect = {
      x: this.body.left + 3,
      y: this.body.bottom - 5,
      width: this.body.width - 6,
      height: 5,
    };
    if (!this.ctx.level.hazardAt(feet)) return;
    this.controller.launch(HAZARD_BOUNCE);
    audio.sfx.play("ball_bounce", { pitch: 0.8 });
    this.ctx.fx.splat(this.sprite.x, this.sprite.y);
  }

  /** Anything the ball rolls into at speed gets bowled over. */
  private strike(out: BallOutput, dt: number): void {
    this.strikeAge -= dt;
    if (this.strikeAge <= 0) {
      this.strikeKey = `ball-roll-${++strikeSerial}`;
      this.strikeAge = STRIKE_KEY_SECONDS;
    }
    const speed = Math.max(Math.hypot(out.vx, out.vy), out.impactSpeed);
    if (speed < STRIKE_SPEED || this.controller.slamming) return;
    const direction = Math.sign(out.vx) || this.controller.facing;
    const smash = speed >= SMASH_SPEED;
    const hit: HitInfo = {
      key: this.strikeKey,
      team: "player",
      kind: "launched",
      damage: smash ? 3 : 2,
      knockbackX: direction * 300,
      knockbackY: -240,
      x: this.sprite.x + direction * BODY_SIZE * 0.5,
      y: this.sprite.y - BODY_SIZE / 2,
      impact: smash ? 1 : 0.8,
      sfx: "ball_smash",
    };
    const area = rectAround(this.sprite.x, this.sprite.y - BODY_SIZE / 2, BODY_SIZE / 2 + 3);
    for (const outcome of this.ctx.combat.strike(area, hit)) {
      presentHit(this.ctx.fx, hit, outcome.result, ROLL_WORDS);
    }
  }

  private animate(out: BallOutput, dt: number): void {
    this.squash -= dt;
    const c = this.controller;
    this.sprite.setFlipX(c.facing < 0);
    if (c.slamming) {
      this.play("slam");
    } else if (this.squash > 0) {
      if (out.events.includes("bounce") || out.events.includes("wallBounce"))
        this.play("squash", true);
    } else if (Math.abs(out.vx) > 12 || out.vy < -20) {
      this.play("roll");
      this.sprite.anims.timeScale = Math.min(3, Math.max(0.3, Math.abs(out.vx) / 110));
      return;
    } else {
      this.play("idle");
    }
    this.sprite.anims.timeScale = 1;
  }

  private play(name: string, restart = false): void {
    const key = animationKey(BALL_SHEET_KEY, name);
    if (restart || this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
  }
}
