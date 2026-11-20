/**
 * Environmental explosions (toxic barrels). Team "environment" hits every
 * target — player, enemies and other props — which is what lets barrels chain.
 */
import { audio } from "../../audio";
import { presentHit } from "../combat/hit-feedback";
import { type HitInfo, rectAround } from "../combat/hit-types";
import type { StageContext } from "../stage/stage-context";

const BLAST_WORDS = ["KA-BLOOEY!", "KRA-KOOM!", "SPLOOSH!"];

let blastSerial = 0;

export interface BlastSpec {
  radius: number;
  damage: number;
  knockback: number;
}

export function environmentBlast(ctx: StageContext, x: number, y: number, spec: BlastSpec): void {
  const hit: HitInfo = {
    key: `env-blast-${++blastSerial}`,
    team: "environment",
    kind: "explosion",
    damage: spec.damage,
    knockbackX: spec.knockback,
    knockbackY: -spec.knockback * 0.9,
    x,
    y,
    impact: 1,
    radial: true,
  };
  audio.sfx.play("barrel_explode");
  ctx.fx.burst(x, y);
  ctx.fx.particles("slime", x, y, 16);
  ctx.fx.particles("stink", x, y - 6, 8);
  ctx.fx.shake(0.9, 200);
  ctx.fx.word(BLAST_WORDS[blastSerial % BLAST_WORDS.length]!, x, y - 20, "pink");
  for (const outcome of ctx.combat.strike(rectAround(x, y, spec.radius), hit)) {
    presentHit(ctx.fx, hit, outcome.result);
  }
}
