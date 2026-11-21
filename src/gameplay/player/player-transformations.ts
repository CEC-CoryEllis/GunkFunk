/**
 * Bulgo's power-ups as the player entity sees them: starting and refreshing
 * them, expiry, the Wrecking Ball form taking over the body, the ball
 * shrugging off hits (explosions pop it), and dropping everything on death.
 */
import type { ActionSnapshot } from "../../core/input/actions";
import type { QuipTrigger } from "../characters/character-definition";
import { type HitInfo, type HitResult, MISSED } from "../combat/hit-types";
import { POWERUP_WARNING_SECONDS } from "../powerups/powerup-definitions";
import type { PowerUpId } from "../powerups/powerup-ids";
import type { WreckingBall } from "./forms/wrecking-ball";
import type { PlayerPowerUps } from "./player-powerups";

export interface TransformHooks {
  /** A power-up started, was refreshed, or ended. */
  changed(id: PowerUpId, active: boolean): void;
  say(trigger: QuipTrigger): void;
  /** Interrupt any attack in progress (transforming mid-punch). */
  cancelCombat(): void;
  /** The ball has gone: put Bulgo's own sprite, body and movement back. */
  restoreBulgo(announce: boolean): void;
}

export class PlayerTransformations {
  constructor(
    readonly powerUps: PlayerPowerUps,
    readonly ball: WreckingBall,
    private readonly hooks: TransformHooks,
  ) {}

  /** The Wrecking Ball is about to run out of air (it flashes). */
  get ballEnding(): boolean {
    return (
      this.ball.phase === "rolling" &&
      this.powerUps.remainingOf("wreckingBall") < POWERUP_WARNING_SECONDS
    );
  }

  collect(id: PowerUpId): void {
    this.powerUps.activate(id);
    if (id === "wreckingBall" && !this.ball.active) {
      this.hooks.cancelCombat();
      this.ball.begin();
      this.hooks.say("transform");
    } else if (id !== "wreckingBall") {
      this.hooks.say("powerUp");
    }
    this.hooks.changed(id, true);
  }

  /** Counts power-ups down and ends the ones that ran out. */
  tick(dt: number): void {
    for (const id of this.powerUps.tick(dt)) this.ended(id, false);
  }

  /** Runs the ball form for one step (only while `ball.active`). */
  updateBall(input: ActionSnapshot, dt: number): void {
    if (this.ball.update(input, dt)) this.hooks.restoreBulgo(true);
  }

  /** The ball shrugs off hits, except explosions, which pop it. */
  absorbHit(hit: HitInfo): HitResult {
    if (hit.kind === "explosion" && this.ball.phase === "rolling") {
      this.powerUps.end("wreckingBall");
      this.ended("wreckingBall", true);
    }
    return MISSED;
  }

  /** Death and respawn end every power-up on the spot. */
  dropAll(): void {
    if (this.ball.active) {
      this.ball.cancel();
      this.hooks.restoreBulgo(false);
    }
    for (const id of this.powerUps.clear()) this.hooks.changed(id, false);
  }

  private ended(id: PowerUpId, popped: boolean): void {
    if (id === "wreckingBall") this.ball.end(popped);
    this.hooks.changed(id, false);
  }
}
