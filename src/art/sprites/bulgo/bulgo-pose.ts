/**
 * Bulgo's pose model. A pose fully describes one animation frame; the rig in
 * `bulgo-rig.ts` turns it into pixels. All coordinates are in frame pixels,
 * relative to the rest pose, for a character facing right.
 */

/** Limb angles in radians: 0 points straight down, +π/2 points forward (right). */
export interface ArmPose {
  /** Shoulder angle. */
  a1: number;
  /** Elbow angle, relative to the upper arm. */
  a2: number;
  /** Forearm length multiplier — Bulgo's arms stretch for big punches. */
  stretch?: number;
  /** Fist radius multiplier (wind-ups and impact frames inflate the fist). */
  fist?: number;
}

export interface FootPose {
  dx: number;
  dy: number;
}

export type EyeStyle = "open" | "blink" | "happy" | "wide" | "squint" | "dizzy" | "pop";
export type BrowStyle = "flat" | "angry" | "worried" | "raised";
export type MouthStyle = "smirk" | "grin" | "shout" | "o" | "tongue" | "frown" | "puff" | "chew";

export interface BulgoPose {
  /** Whole-body offset (bobbing, hops). */
  x: number;
  y: number;
  /** Torso squash & stretch (1 = rest). */
  sx: number;
  sy: number;
  /** Head offset forward / down relative to the torso. */
  lean: number;
  headDrop: number;
  eyes: EyeStyle;
  brow: BrowStyle;
  mouth: MouthStyle;
  /** Pupil direction, roughly -1..1 on each axis. */
  look: readonly [number, number];
  frontArm: ArmPose;
  backArm: ArmPose;
  frontFoot: FootPose;
  backFoot: FootPose;
  /** Sideways sway of the hair sprout. */
  hair: number;
  /** Optional whole-body rotation in quarter turns, used by the double-jump flip. */
  spin?: 0 | 1 | 2 | 3;
  /** Extra props drawn with the pose. */
  props?: readonly PropId[];
  /** Replaces the body with a melted puddle (death / respawn). */
  puddle?: boolean;
}

export type PropId = "sweat" | "booger" | "fingerInNose" | "motionLines" | "stars" | "heart";

export const REST_POSE: BulgoPose = {
  x: 0,
  y: 0,
  sx: 1,
  sy: 1,
  lean: 0,
  headDrop: 0,
  eyes: "open",
  brow: "flat",
  mouth: "smirk",
  look: [1, 0],
  frontArm: { a1: 0.25, a2: -0.15 },
  backArm: { a1: -0.15, a2: 0.25 },
  frontFoot: { dx: 0, dy: 0 },
  backFoot: { dx: 0, dy: 0 },
  hair: 0,
};

export type PoseOverrides = Partial<BulgoPose>;

/** Builds a pose from the rest pose plus overrides. */
export function pose(overrides: PoseOverrides = {}): BulgoPose {
  return { ...REST_POSE, ...overrides };
}

/** Builds a pose from another pose plus overrides (for variations within an animation). */
export function vary(base: BulgoPose, overrides: PoseOverrides): BulgoPose {
  return { ...base, ...overrides };
}
