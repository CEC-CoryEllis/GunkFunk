/**
 * Bulgo's personality animations: the bored idle (nose pick + flick), talking,
 * victory dance, death melt, respawn and the wrecking-ball inflation.
 */
import { type BulgoPose, pose, vary } from "../bulgo-pose";
import type { BulgoAnimation } from "./types";

const pickArm = { a1: 1.57, a2: 0.83, fist: 0.85 } as const;

const bored: BulgoAnimation = {
  name: "bored",
  frameRate: 7,
  repeat: 0,
  holds: [400, 0, 0, 300, 0, 300, 0, 500, 0, 0, 0, 200, 0, 600],
  poses: [
    pose({ eyes: "blink", hair: 0 }),
    pose({ look: [1, -1], eyes: "squint", frontArm: { a1: 1.4, a2: -1.6 } }),
    pose({ look: [1, -1], eyes: "squint", frontArm: pickArm, props: ["fingerInNose"] }),
    pose({
      look: [1, -1],
      eyes: "squint",
      mouth: "o",
      frontArm: pickArm,
      props: ["fingerInNose"],
      y: 0.5,
    }),
    pose({
      look: [1, -1],
      eyes: "squint",
      mouth: "o",
      frontArm: pickArm,
      props: ["fingerInNose"],
      y: -0.5,
    }),
    pose({
      eyes: "wide",
      look: [1, 1],
      mouth: "smirk",
      frontArm: { a1: 1.6, a2: -1.5 },
      props: ["booger"],
    }),
    pose({
      eyes: "open",
      look: [1, 1],
      mouth: "grin",
      brow: "raised",
      frontArm: { a1: 1.6, a2: -1.5 },
      props: ["booger"],
    }),
    pose({
      eyes: "open",
      look: [1, 1],
      mouth: "grin",
      brow: "raised",
      frontArm: { a1: 1.6, a2: -1.5 },
      props: ["booger"],
    }),
    pose({ eyes: "squint", mouth: "smirk", frontArm: { a1: 1.1, a2: -1.9 }, props: ["booger"] }),
    pose({ eyes: "squint", mouth: "smirk", frontArm: { a1: 1.9, a2: -0.3, stretch: 1.3 } }),
    pose({ eyes: "open", look: [1, -1], mouth: "o", frontArm: { a1: 1.7, a2: -0.2 } }),
    pose({ eyes: "happy", mouth: "grin", frontArm: { a1: 0.5, a2: -0.2 } }),
    pose({ eyes: "happy", mouth: "grin", y: 0.5, hair: 1 }),
    pose({ eyes: "open", mouth: "smirk" }),
  ],
};

const talk: BulgoAnimation = {
  name: "talk",
  frameRate: 10,
  repeat: -1,
  poses: (["shout", "smirk", "o", "grin"] as const).map((mouth, i) =>
    pose({ mouth, y: i % 2 ? 0.5 : 0, frontArm: { a1: 0.6 + (i % 2) * 0.5, a2: -0.8 } }),
  ),
};

/** A funky disco strut that ends in a double-bicep flex. */
const discoUp = (side: 1 | -1, hip: number): BulgoPose =>
  pose({
    x: hip,
    eyes: "happy",
    mouth: "grin",
    hair: hip,
    frontArm: side > 0 ? { a1: 2.7, a2: 0.15 } : { a1: 0.3, a2: -1.4 },
    backArm: side > 0 ? { a1: 0.2, a2: 1.2 } : { a1: -2.7, a2: -0.15 },
    frontFoot: { dx: hip + 1, dy: side > 0 ? 0 : -2 },
    backFoot: { dx: hip - 1, dy: side > 0 ? -2 : 0 },
  });
const flex = pose({
  sx: 1.12,
  sy: 1.02,
  eyes: "happy",
  brow: "raised",
  mouth: "grin",
  props: ["heart"],
  frontArm: { a1: 1.9, a2: -2.4, fist: 1.3 },
  backArm: { a1: -1.9, a2: 2.4, fist: 1.2 },
  frontFoot: { dx: 3, dy: 0 },
  backFoot: { dx: -3, dy: 0 },
});
const victory: BulgoAnimation = {
  name: "victory",
  frameRate: 8,
  repeat: 0,
  holds: [0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 1200],
  poses: [
    discoUp(1, 2),
    discoUp(1, 1),
    discoUp(-1, -2),
    discoUp(-1, -1),
    discoUp(1, 2),
    discoUp(1, 1),
    discoUp(-1, -2),
    discoUp(-1, -1),
    pose({
      y: 2,
      sy: 0.85,
      sx: 1.12,
      eyes: "squint",
      mouth: "puff",
      frontArm: { a1: 0.6, a2: 1.2 },
      backArm: { a1: -0.6, a2: -1.2 },
    }),
    vary(flex, { sx: 1.05, props: [] }),
    flex,
    vary(flex, { y: -0.5 }),
  ],
};

/** Shock → melt into a puddle of green goo with blinking eyes. */
const melt = (t: number): BulgoPose =>
  pose({
    y: t * 6,
    sx: 1 + t * 0.7,
    sy: 1 - t * 0.6,
    headDrop: t * 9,
    eyes: t > 0.6 ? "dizzy" : "pop",
    brow: "worried",
    mouth: "frown",
    hair: -t * 3,
    frontArm: { a1: 0.6 + t, a2: 0.4 },
    backArm: { a1: -0.6 - t, a2: -0.4 },
    frontFoot: { dx: 2 + t * 4, dy: 0 },
    backFoot: { dx: -2 - t * 4, dy: 0 },
  });
const death: BulgoAnimation = {
  name: "death",
  frameRate: 10,
  repeat: 0,
  holds: [200, 0, 0, 0, 0, 0, 0, 300, 0, 800],
  poses: [
    pose({
      y: -4,
      eyes: "pop",
      mouth: "shout",
      hair: 5,
      frontArm: { a1: 2.8, a2: 0.2 },
      backArm: { a1: -2.8, a2: -0.2 },
      frontFoot: { dx: 2, dy: -3 },
      backFoot: { dx: -2, dy: -3 },
    }),
    melt(0),
    melt(0.2),
    melt(0.4),
    melt(0.6),
    melt(0.8),
    melt(1),
    pose({ puddle: true, eyes: "open", look: [0, -1] }),
    pose({ puddle: true, eyes: "blink" }),
    pose({ puddle: true, eyes: "open", look: [-1, -1] }),
  ],
};

const respawn: BulgoAnimation = {
  name: "respawn",
  frameRate: 14,
  repeat: 0,
  holds: [100, 0, 0, 0, 0, 0, 300],
  poses: [
    pose({ puddle: true, eyes: "open", look: [1, -1] }),
    melt(0.8),
    melt(0.5),
    melt(0.2),
    pose({
      y: -2,
      sy: 1.15,
      sx: 0.9,
      eyes: "wide",
      mouth: "grin",
      hair: 4,
      frontArm: { a1: 2.6, a2: 0.2 },
      backArm: { a1: -2.6, a2: -0.2 },
    }),
    pose({
      sy: 0.95,
      sx: 1.05,
      eyes: "happy",
      mouth: "grin",
      frontArm: { a1: 2.7, a2: 0.1 },
      backArm: { a1: -2.7, a2: -0.1 },
    }),
    pose({
      eyes: "open",
      mouth: "grin",
      brow: "raised",
      frontArm: { a1: 2.7, a2: 0.1 },
      backArm: { a1: 0.2, a2: 0 },
    }),
  ],
};

/** The start of the Wrecking Ball transformation: Bulgo inflates like a balloon. */
const inflate: BulgoAnimation = {
  name: "inflate",
  frameRate: 12,
  repeat: 0,
  holds: [100, 0, 0, 0, 0, 150],
  poses: [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) =>
    pose({
      y: -t * 3,
      sx: 1 + t * 0.45,
      sy: 1 + t * 0.25,
      eyes: t > 0.5 ? "wide" : "squint",
      brow: "raised",
      mouth: "puff",
      hair: t * 4,
      props: t > 0.3 && t < 0.9 ? ["sweat"] : [],
      frontArm: { a1: 0.6 + t * 1.2, a2: 0 },
      backArm: { a1: -0.6 - t * 1.2, a2: 0 },
      frontFoot: { dx: 1 + t * 2, dy: -t * 2 },
      backFoot: { dx: -1 - t * 2, dy: -t * 2 },
    }),
  ),
};

export const PERSONALITY_ANIMATIONS: readonly BulgoAnimation[] = [
  bored,
  talk,
  victory,
  death,
  respawn,
  inflate,
];
