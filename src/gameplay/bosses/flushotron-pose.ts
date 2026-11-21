/**
 * How the Flush-o-Tron looks right now, derived from what its brain is doing
 * and where it is: which hull frame, whether it's on legs, jets or a spring,
 * Stinkbottom's expression, and how far the plunger is out.
 */
import type { HullState } from "../../art/sprites/bosses/flushotron-sheets";
import type { FlushOTronBrain } from "./flushotron-brain";
import { legsPoseFor, type TronMotion } from "./flushotron-motion";
import { type ProfessorFace, type RigPose, SPRING_HEIGHT, type SpringPose } from "./flushotron-rig";

/** Full plunger reach in pixels. */
export const ARM_REACH = 112;
/** Breakdown 1 blows the legs off and lights the jets at this moment. */
const LEGS_OFF_AT = 0.6;
/** Breakdown 2 blows the lid off (and the spring takes over) at this moment. */
const LID_OFF_AT = 2.1;

/** The plunger shoots out, holds, and pulls back over the plunge action. */
export function armLength(brain: FlushOTronBrain): number {
  if (brain.action !== "plunge") return 0;
  const t = brain.time;
  if (t < 0.4) return 0;
  if (t < 0.6) return ((t - 0.4) / 0.2) * ARM_REACH;
  if (t < 1) return ARM_REACH;
  if (t < 1.2) return (1 - (t - 1) / 0.2) * ARM_REACH;
  return 0;
}

function hullState(brain: FlushOTronBrain): HullState {
  const { phase, action, time } = brain;
  if (phase === 3 || action === "breakdown2") {
    return action === "breakdown2" && time < LID_OFF_AT ? "cracked" : "wrecked";
  }
  if (action === "vent" || action === "overheat") return "vent";
  return phase === 2 ? "cracked" : "normal";
}

function springPose(brain: FlushOTronBrain, motion: TronMotion): SpringPose {
  const { phase, action, time } = brain;
  if (phase < 3 && !(action === "breakdown2" && time >= LID_OFF_AT)) return "hidden";
  return motion.hullBottom < motion.floorY - SPRING_HEIGHT.squashed - 2 ? "sprung" : "squashed";
}

function professorFace(brain: FlushOTronBrain, hurt: boolean, defeated: boolean): ProfessorFace {
  if (defeated) return "dizzy";
  if (hurt) return "hurt";
  const { action } = brain;
  if (action === "vent" || action === "overheat") return "dizzy";
  if (action === "breakdown1" || action === "breakdown2" || action === "flasks") return "shout";
  return "laugh";
}

export function tronPose(
  brain: FlushOTronBrain,
  motion: TronMotion,
  status: { hurt: boolean; defeated: boolean },
): RigPose {
  const { phase, action, time } = brain;
  const onLegs = action === "breakdown1" ? time < LEGS_OFF_AT : phase === 1;
  return {
    x: motion.x,
    floorY: motion.floorY,
    hullBottom: motion.hullBottom,
    facing: motion.facing,
    hull: hullState(brain),
    legs: onLegs ? legsPoseFor(brain) : "hidden",
    jets: phase === 2 || (action === "breakdown1" && time >= LEGS_OFF_AT),
    spring: springPose(brain, motion),
    professor: professorFace(brain, status.hurt, status.defeated),
    armLength: armLength(brain),
  };
}
