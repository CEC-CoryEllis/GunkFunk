/**
 * Bulgo's walk/run cycle generator, shared by the locomotion animations and
 * the run-and-gun animation (same legs, arm locked forward).
 */
import { type BulgoPose, type PoseOverrides, pose } from "../bulgo-pose";

/** One gait pose: `intensity` 0 = waddle, 1 = full sprint. */
export function gaitPose(
  phase: number,
  intensity: number,
  overrides: PoseOverrides = {},
): BulgoPose {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const stride = 3 + intensity * 2;
  return pose({
    x: intensity,
    y: Math.abs(c) * -(0.8 + intensity * 0.7),
    sx: 1 + Math.abs(s) * 0.04,
    sy: 1 - Math.abs(s) * 0.04,
    lean: intensity * 2,
    mouth: intensity > 0.5 ? "tongue" : "smirk",
    hair: -intensity * 2 - Math.abs(c),
    frontArm: {
      a1: 0.3 + s * (0.4 + intensity * 0.5),
      a2: -0.3 - intensity * (0.3 + Math.max(0, s) * 0.4),
    },
    backArm: { a1: 0.1 - s * (0.4 + intensity * 0.5), a2: -0.3 - intensity * 0.3 },
    frontFoot: { dx: s * stride, dy: -Math.max(0, -c) * (2 + intensity) },
    backFoot: { dx: -s * stride, dy: -Math.max(0, c) * (2 + intensity) },
    ...overrides,
  });
}

export function gaitCycle(
  frames: number,
  intensity: number,
  overrides: PoseOverrides = {},
): BulgoPose[] {
  return Array.from({ length: frames }, (_, i) =>
    gaitPose((i / frames) * Math.PI * 2, intensity, overrides),
  );
}
