/**
 * Turns player events into sound, particles, camera juice and quips. Keeping
 * this mapping in one place makes tuning the "feel" of actions easy.
 */
import { audio } from "../../audio";
import type { QuipTrigger } from "../characters/character-definition";
import type { Effects } from "../fx/effects";
import type { MovementEvent } from "./movement-controller";

export interface FeedbackContext {
  fx: Effects;
  x: number;
  y: number;
  facing: 1 | -1;
  say(trigger: QuipTrigger): void;
}

export function playMovementFeedback(events: readonly MovementEvent[], ctx: FeedbackContext): void {
  for (const event of events) {
    switch (event) {
      case "jump":
        audio.sfx.play("jump");
        ctx.fx.dust(ctx.x, ctx.y);
        break;
      case "doubleJump":
        audio.sfx.play("double_jump");
        ctx.fx.dust(ctx.x, ctx.y + 4);
        ctx.say("doubleJump");
        break;
      case "wallJump":
        audio.sfx.play("wall_jump");
        ctx.fx.dust(ctx.x - ctx.facing * 8, ctx.y - 10, ctx.facing > 0);
        ctx.say("wallJump");
        break;
      case "land":
        audio.sfx.play("land", { volume: 0.7 });
        ctx.fx.dust(ctx.x, ctx.y);
        break;
      case "hardLand":
        audio.sfx.play("land", { pitch: 0.8 });
        ctx.fx.dust(ctx.x - 8, ctx.y, true);
        ctx.fx.dust(ctx.x + 8, ctx.y);
        ctx.fx.shake(0.4);
        ctx.say("hardLand");
        break;
      case "skid":
        ctx.fx.dust(ctx.x + ctx.facing * 6, ctx.y, ctx.facing < 0);
        audio.sfx.play("footstep", { pitch: 1.3 });
        break;
      case "slideStart":
        audio.sfx.play("slide");
        ctx.fx.dust(ctx.x - ctx.facing * 6, ctx.y, ctx.facing > 0);
        break;
      case "climbStart":
      case "dropThrough":
        break;
    }
  }
}
