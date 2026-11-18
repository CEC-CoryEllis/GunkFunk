/**
 * Shooting on the move and the charged mega punch. The front arm is locked
 * straight forward in every shooting frame so the held weapon sprite can be
 * pinned to the hand anchor.
 */
import { pose } from "../bulgo-pose";
import { gaitCycle } from "./gait";
import { HALF_PI, type BulgoAnimation } from "./types";

const GUN_ARM = { a1: HALF_PI, a2: 0, stretch: 1.05 } as const;

const runShoot: BulgoAnimation = {
  name: "run_shoot",
  frameRate: 14,
  repeat: -1,
  poses: gaitCycle(8, 1, { frontArm: GUN_ARM, mouth: "grin", brow: "angry" }),
};

const airShoot: BulgoAnimation = {
  name: "air_shoot",
  frameRate: 10,
  repeat: -1,
  poses: [0, 1].map((i) =>
    pose({
      y: -1,
      brow: "angry",
      mouth: i === 0 ? "grin" : "shout",
      hair: 2,
      frontArm: GUN_ARM,
      backArm: { a1: -1.6 - i * 0.3, a2: -0.6 },
      frontFoot: { dx: 2, dy: -3 + i },
      backFoot: { dx: -2, dy: -2 },
    }),
  ),
};

/** Wind-back, then the arm fires out like a rubber cannon and the fist balloons. */
const megaPunch: BulgoAnimation = {
  name: "mega_punch",
  frameRate: 18,
  repeat: 0,
  holds: [0, 0, 160, 0, 0],
  poses: [
    pose({
      x: -3,
      lean: -3,
      eyes: "squint",
      brow: "angry",
      mouth: "puff",
      frontArm: { a1: -0.4, a2: 1.6, fist: 1.4 },
      frontFoot: { dx: -1, dy: 0 },
      backFoot: { dx: -4, dy: 0 },
    }),
    pose({
      x: 3,
      lean: 4,
      eyes: "wide",
      brow: "angry",
      mouth: "shout",
      frontArm: { a1: HALF_PI, a2: 0, stretch: 2.2, fist: 1.5 },
      frontFoot: { dx: 6, dy: 0 },
      backFoot: { dx: -3, dy: 0 },
    }),
    pose({
      x: 4,
      lean: 5,
      sx: 1.05,
      eyes: "wide",
      brow: "angry",
      mouth: "shout",
      hair: -4,
      props: ["motionLines"],
      frontArm: { a1: HALF_PI, a2: 0, stretch: 3.4, fist: 1.7 },
      frontFoot: { dx: 7, dy: 0 },
      backFoot: { dx: -3, dy: 0 },
    }),
    pose({
      x: 3,
      lean: 3,
      eyes: "happy",
      mouth: "grin",
      frontArm: { a1: HALF_PI - 0.1, a2: -0.2, stretch: 1.8, fist: 1.3 },
      frontFoot: { dx: 5, dy: 0 },
    }),
    pose({
      x: 1,
      lean: 1,
      mouth: "grin",
      frontArm: { a1: 0.6, a2: -0.4, stretch: 1.1 },
      frontFoot: { dx: 2, dy: 0 },
    }),
  ],
};

export const GUNPLAY_ANIMATIONS: readonly BulgoAnimation[] = [runShoot, airShoot, megaPunch];
