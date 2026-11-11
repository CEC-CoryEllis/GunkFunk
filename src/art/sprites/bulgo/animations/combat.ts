/**
 * Bulgo's combat animations. His melee is all body: a rubber-arm jab, a
 * rocket uppercut and a belly bump that inflates his gut into a battering ram.
 */
import { pose } from "../bulgo-pose";
import { HALF_PI, type BulgoAnimation } from "./types";

const punch1: BulgoAnimation = {
  name: "punch1",
  frameRate: 22,
  repeat: 0,
  holds: [0, 0, 40, 0],
  poses: [
    pose({
      lean: -1,
      brow: "angry",
      frontArm: { a1: 0.2, a2: -1.6, fist: 1.1 },
      frontFoot: { dx: 2, dy: 0 },
    }),
    pose({
      x: 2,
      lean: 3,
      brow: "angry",
      mouth: "shout",
      frontArm: { a1: HALF_PI, a2: 0, stretch: 1.6, fist: 1.2 },
      frontFoot: { dx: 4, dy: 0 },
      backFoot: { dx: -2, dy: 0 },
    }),
    pose({
      x: 3,
      lean: 4,
      brow: "angry",
      mouth: "shout",
      frontArm: { a1: HALF_PI, a2: 0, stretch: 2.6, fist: 1.35 },
      frontFoot: { dx: 5, dy: 0 },
      backFoot: { dx: -2, dy: 0 },
    }),
    pose({
      x: 1,
      lean: 2,
      brow: "angry",
      frontArm: { a1: HALF_PI - 0.2, a2: -0.3, stretch: 1.2 },
      frontFoot: { dx: 3, dy: 0 },
    }),
  ],
};

const punch2: BulgoAnimation = {
  name: "punch2",
  frameRate: 22,
  repeat: 0,
  holds: [20, 0, 50, 0],
  poses: [
    pose({
      y: 2,
      sy: 0.9,
      sx: 1.08,
      headDrop: 2,
      brow: "angry",
      mouth: "smirk",
      frontArm: { a1: 0.1, a2: 0.4, fist: 1.15 },
      frontFoot: { dx: 3, dy: 0 },
    }),
    pose({
      y: -1,
      sy: 1.08,
      lean: 2,
      brow: "angry",
      mouth: "shout",
      frontArm: { a1: 2.2, a2: 0.2, stretch: 1.6, fist: 1.25 },
      frontFoot: { dx: 3, dy: 0 },
    }),
    pose({
      y: -3,
      sy: 1.15,
      sx: 0.92,
      lean: 1,
      eyes: "squint",
      brow: "angry",
      mouth: "shout",
      hair: 3,
      frontArm: { a1: 2.75, a2: 0.1, stretch: 2.4, fist: 1.4 },
      frontFoot: { dx: 2, dy: -2 },
      backFoot: { dx: -1, dy: 0 },
    }),
    pose({ y: -1, sy: 1.04, brow: "angry", frontArm: { a1: 2.1, a2: 0.6, stretch: 1.2 } }),
  ],
};

const punch3: BulgoAnimation = {
  name: "punch3",
  frameRate: 18,
  repeat: 0,
  holds: [40, 0, 0, 80, 0, 0],
  poses: [
    pose({
      x: -3,
      lean: -3,
      sx: 0.92,
      sy: 1.04,
      eyes: "squint",
      mouth: "puff",
      frontArm: { a1: -0.6, a2: 0.9 },
      backArm: { a1: -0.8, a2: 0.9 },
      frontFoot: { dx: -1, dy: 0 },
      backFoot: { dx: -3, dy: 0 },
    }),
    pose({
      x: 0,
      lean: 0,
      sx: 1.05,
      eyes: "squint",
      mouth: "puff",
      frontArm: { a1: -0.8, a2: 1.2 },
      backArm: { a1: -0.9, a2: 1.2 },
      frontFoot: { dx: 2, dy: -2 },
    }),
    pose({
      x: 5,
      lean: 4,
      sx: 1.25,
      sy: 0.95,
      eyes: "wide",
      brow: "angry",
      mouth: "shout",
      frontArm: { a1: -0.9, a2: 1.6 },
      backArm: { a1: -1, a2: 1.6 },
      frontFoot: { dx: 6, dy: 0 },
      backFoot: { dx: -2, dy: 0 },
    }),
    pose({
      x: 7,
      lean: 5,
      sx: 1.35,
      sy: 0.92,
      eyes: "squint",
      brow: "angry",
      mouth: "grin",
      props: ["motionLines"],
      frontArm: { a1: -0.9, a2: 1.8 },
      backArm: { a1: -1, a2: 1.8 },
      frontFoot: { dx: 7, dy: 0 },
      backFoot: { dx: -1, dy: 0 },
    }),
    pose({
      x: 5,
      lean: 3,
      sx: 1.1,
      mouth: "grin",
      frontArm: { a1: -0.5, a2: 0.1 },
      frontFoot: { dx: 5, dy: 0 },
    }),
    pose({ x: 2, lean: 1, mouth: "smirk", frontFoot: { dx: 2, dy: 0 } }),
  ],
};

const airPunch: BulgoAnimation = {
  name: "air_punch",
  frameRate: 20,
  repeat: 0,
  holds: [0, 60, 0],
  poses: [
    pose({
      y: -1,
      brow: "angry",
      mouth: "smirk",
      frontArm: { a1: 1.1, a2: -1.5, fist: 1.1 },
      frontFoot: { dx: 1, dy: -3 },
      backFoot: { dx: -2, dy: -2 },
    }),
    pose({
      y: -1,
      lean: 3,
      brow: "angry",
      mouth: "shout",
      frontArm: { a1: 1.15, a2: 0, stretch: 2.4, fist: 1.35 },
      frontFoot: { dx: -1, dy: -3 },
      backFoot: { dx: -3, dy: -2 },
    }),
    pose({
      y: -1,
      lean: 1,
      brow: "angry",
      frontArm: { a1: 1.3, a2: -0.4, stretch: 1.2 },
      frontFoot: { dx: 1, dy: -3 },
      backFoot: { dx: -2, dy: -2 },
    }),
  ],
};

/** Arm out front, holding whatever weapon is equipped (drawn separately at the hand). */
const shoot: BulgoAnimation = {
  name: "shoot",
  frameRate: 20,
  repeat: 0,
  poses: [
    pose({
      x: -1,
      lean: -1,
      brow: "angry",
      mouth: "grin",
      frontArm: { a1: HALF_PI, a2: 0, stretch: 1.1 },
      frontFoot: { dx: 1, dy: 0 },
    }),
    pose({
      x: -2,
      lean: -2,
      eyes: "squint",
      brow: "angry",
      mouth: "shout",
      hair: -2,
      frontArm: { a1: HALF_PI + 0.15, a2: -0.1, stretch: 0.9 },
      frontFoot: { dx: 0, dy: 0 },
    }),
    pose({
      x: -1,
      lean: -1,
      brow: "angry",
      mouth: "grin",
      frontArm: { a1: HALF_PI, a2: 0, stretch: 1.05 },
      frontFoot: { dx: 1, dy: 0 },
    }),
  ],
};

const charge: BulgoAnimation = {
  name: "charge",
  frameRate: 16,
  repeat: -1,
  poses: [0, 1, 2, 3].map((i) =>
    pose({
      x: i % 2 === 0 ? -1 : 1,
      sx: 1.04 + (i % 2) * 0.03,
      sy: 0.97,
      eyes: "squint",
      brow: "angry",
      mouth: "puff",
      props: i < 2 ? ["sweat"] : [],
      hair: i % 2 === 0 ? -1 : 1,
      frontArm: { a1: -0.5, a2: 0.9, fist: 1.2 + (i % 2) * 0.1 },
      backArm: { a1: -0.4, a2: 0.4 },
      frontFoot: { dx: 3, dy: 0 },
      backFoot: { dx: -3, dy: 0 },
    }),
  ),
};

const hurt: BulgoAnimation = {
  name: "hurt",
  frameRate: 14,
  repeat: 0,
  holds: [60, 0],
  poses: [
    pose({
      x: -3,
      sy: 0.85,
      sx: 1.12,
      lean: -3,
      eyes: "pop",
      mouth: "shout",
      hair: 4,
      frontArm: { a1: 2.4, a2: 0.8 },
      backArm: { a1: -2.4, a2: -0.8 },
      frontFoot: { dx: 3, dy: -2 },
      backFoot: { dx: -3, dy: 0 },
    }),
    pose({
      x: -2,
      sy: 1.05,
      lean: -2,
      eyes: "dizzy",
      brow: "worried",
      mouth: "frown",
      props: ["stars"],
      hair: 2,
      frontArm: { a1: 1.5, a2: 0.6 },
      backArm: { a1: -1.5, a2: -0.6 },
      frontFoot: { dx: 2, dy: -1 },
    }),
  ],
};

export const COMBAT_ANIMATIONS: readonly BulgoAnimation[] = [
  punch1,
  punch2,
  punch3,
  airPunch,
  shoot,
  charge,
  hurt,
];
