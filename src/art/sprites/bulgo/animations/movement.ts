/**
 * Bulgo's locomotion animations: idle, walk, run, skid, jumps, landing,
 * crouch, belly-slide, wall-slide and climbing.
 */
import { pose, vary } from "../bulgo-pose";
import { gaitCycle } from "./gait";
import type { BulgoAnimation } from "./types";

const idleBase = pose();

const idle: BulgoAnimation = {
  name: "idle",
  frameRate: 6,
  repeat: -1,
  poses: [
    idleBase,
    vary(idleBase, { y: 0.5, sy: 0.97, sx: 1.02, hair: 0.5 }),
    vary(idleBase, {
      y: 1,
      sy: 0.95,
      sx: 1.04,
      headDrop: 1,
      hair: 1,
      frontArm: { a1: 0.22, a2: -0.1 },
    }),
    vary(idleBase, { y: 0.5, sy: 0.97, sx: 1.02, hair: 0.5, eyes: "blink" }),
  ],
};

const walk: BulgoAnimation = { name: "walk", frameRate: 10, repeat: -1, poses: gaitCycle(8, 0.15) };
const run: BulgoAnimation = { name: "run", frameRate: 14, repeat: -1, poses: gaitCycle(8, 1) };

const skid: BulgoAnimation = {
  name: "skid",
  frameRate: 12,
  repeat: -1,
  poses: [0, 1].map((i) =>
    pose({
      x: -2,
      lean: -3,
      sx: 1.05,
      sy: 0.95,
      eyes: "wide",
      brow: "worried",
      mouth: "shout",
      hair: 3,
      props: i === 0 ? ["sweat"] : [],
      frontArm: { a1: 2.2, a2: 0.6 },
      backArm: { a1: -1.2, a2: -1.1 },
      frontFoot: { dx: 6, dy: 0 },
      backFoot: { dx: 1 + i, dy: 0 },
    }),
  ),
};

const jump: BulgoAnimation = {
  name: "jump",
  frameRate: 12,
  repeat: 0,
  poses: [
    pose({
      sy: 1.12,
      sx: 0.92,
      y: -1,
      eyes: "wide",
      mouth: "o",
      hair: 2,
      frontArm: { a1: 2.6, a2: 0.3 },
      backArm: { a1: -2.4, a2: -0.3 },
      frontFoot: { dx: 1, dy: -2 },
      backFoot: { dx: -1, dy: -1 },
    }),
    pose({
      sy: 1.06,
      sx: 0.96,
      y: -1,
      mouth: "grin",
      hair: 1.5,
      frontArm: { a1: 2.2, a2: 0.4 },
      backArm: { a1: -2, a2: -0.4 },
      frontFoot: { dx: 2, dy: -3 },
      backFoot: { dx: -2, dy: -2 },
    }),
  ],
};

const fall: BulgoAnimation = {
  name: "fall",
  frameRate: 10,
  repeat: -1,
  poses: [
    pose({
      y: -1,
      eyes: "wide",
      brow: "worried",
      mouth: "o",
      hair: -2,
      frontArm: { a1: 1.9, a2: 0.8 },
      backArm: { a1: -1.9, a2: -0.8 },
      frontFoot: { dx: 2, dy: -1 },
      backFoot: { dx: -2, dy: 0 },
    }),
    pose({
      y: -1,
      eyes: "wide",
      brow: "worried",
      mouth: "o",
      hair: -3,
      frontArm: { a1: 2.1, a2: 0.6 },
      backArm: { a1: -2.1, a2: -0.6 },
      frontFoot: { dx: 1, dy: 0 },
      backFoot: { dx: -1, dy: -1 },
    }),
  ],
};

/** Tucked cannonball spin, rotated a quarter turn per frame. */
const tuck = pose({
  y: -1,
  sx: 0.95,
  sy: 0.9,
  eyes: "squint",
  mouth: "grin",
  frontArm: { a1: 0.9, a2: -2.2 },
  backArm: { a1: 0.6, a2: -2 },
  frontFoot: { dx: 2, dy: -5 },
  backFoot: { dx: 1, dy: -5 },
});
const doubleJump: BulgoAnimation = {
  name: "double_jump",
  frameRate: 20,
  repeat: 0,
  poses: [
    vary(tuck, { spin: 0 }),
    vary(tuck, { spin: 1 }),
    vary(tuck, { spin: 2 }),
    vary(tuck, { spin: 3 }),
    vary(tuck, { spin: 0, eyes: "open" }),
  ],
};

const land: BulgoAnimation = {
  name: "land",
  frameRate: 18,
  repeat: 0,
  poses: [
    pose({
      sy: 0.78,
      sx: 1.18,
      headDrop: 3,
      eyes: "squint",
      mouth: "frown",
      hair: -2,
      frontArm: { a1: 0.9, a2: -0.2 },
      backArm: { a1: -0.9, a2: 0.2 },
      frontFoot: { dx: 2, dy: 0 },
      backFoot: { dx: -2, dy: 0 },
    }),
    pose({
      sy: 0.9,
      sx: 1.08,
      headDrop: 1,
      eyes: "open",
      frontArm: { a1: 0.5, a2: -0.2 },
      backArm: { a1: -0.4, a2: 0.2 },
      frontFoot: { dx: 1, dy: 0 },
      backFoot: { dx: -1, dy: 0 },
    }),
    pose({ sy: 1.03, sx: 0.98, hair: 1 }),
  ],
};

const crouchPose = pose({
  y: 4,
  sy: 0.78,
  sx: 1.15,
  headDrop: 3,
  lean: 1,
  eyes: "squint",
  brow: "angry",
  frontArm: { a1: 0.5, a2: 0.2 },
  backArm: { a1: -0.3, a2: 0.4 },
  frontFoot: { dx: 3, dy: 0 },
  backFoot: { dx: -3, dy: 0 },
});
const crouch: BulgoAnimation = {
  name: "crouch",
  frameRate: 16,
  repeat: 0,
  poses: [vary(crouchPose, { y: 2, sy: 0.88, sx: 1.08, headDrop: 1 }), crouchPose],
};

/** Feet-first baseball slide: low, leaning back, arms flung up behind. */
const slidePose = pose({
  x: -3,
  y: 6,
  sx: 1.1,
  sy: 0.72,
  lean: -3,
  headDrop: 2,
  eyes: "wide",
  mouth: "grin",
  hair: -4,
  frontArm: { a1: -2.3, a2: -0.3 },
  backArm: { a1: -2.6, a2: -0.2 },
  frontFoot: { dx: 10, dy: -1 },
  backFoot: { dx: 8, dy: 0 },
});
const slide: BulgoAnimation = {
  name: "slide",
  frameRate: 14,
  repeat: -1,
  poses: [slidePose, vary(slidePose, { props: ["motionLines"], hair: -4 })],
};

const wallSlide: BulgoAnimation = {
  name: "wall_slide",
  frameRate: 8,
  repeat: -1,
  poses: [0, 1].map((i) =>
    pose({
      x: 3,
      lean: 2,
      eyes: "squint",
      brow: "worried",
      mouth: "frown",
      props: i ? ["sweat"] : [],
      hair: 2 + i,
      frontArm: { a1: 2.5, a2: 0.2 },
      backArm: { a1: 2.2, a2: 0.4 },
      frontFoot: { dx: 4, dy: -3 - i },
      backFoot: { dx: 2, dy: 0 },
    }),
  ),
};

const climb: BulgoAnimation = {
  name: "climb",
  frameRate: 8,
  repeat: -1,
  poses: [0, 1, 2, 3].map((i) => {
    const up = i % 2 === 0;
    return pose({
      y: i === 1 || i === 3 ? -1 : 0,
      lean: 1,
      mouth: "tongue",
      eyes: "squint",
      frontArm: { a1: up ? 2.8 : 2.2, a2: 0.3 },
      backArm: { a1: up ? 2.2 : 2.8, a2: 0.3 },
      frontFoot: { dx: 2, dy: up ? -3 : 0 },
      backFoot: { dx: -1, dy: up ? 0 : -3 },
    });
  }),
};

export const MOVEMENT_ANIMATIONS: readonly BulgoAnimation[] = [
  idle,
  walk,
  run,
  skid,
  jump,
  fall,
  doubleJump,
  land,
  crouch,
  slide,
  wallSlide,
  climb,
];
