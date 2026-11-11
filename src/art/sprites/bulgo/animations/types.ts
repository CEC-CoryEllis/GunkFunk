import type { BulgoPose } from "../bulgo-pose";

export interface BulgoAnimation {
  name: string;
  frameRate: number;
  /** -1 loops, 0 plays once. */
  repeat: number;
  /** Extra milliseconds per frame, by index. */
  holds?: number[];
  poses: BulgoPose[];
}

export const HALF_PI = Math.PI / 2;
