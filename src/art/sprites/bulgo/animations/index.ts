import { COMBAT_ANIMATIONS } from "./combat";
import { MOVEMENT_ANIMATIONS } from "./movement";
import { PERSONALITY_ANIMATIONS } from "./personality";
import type { BulgoAnimation } from "./types";

export type { BulgoAnimation } from "./types";

export const BULGO_ANIMATIONS: readonly BulgoAnimation[] = [
  ...MOVEMENT_ANIMATIONS,
  ...COMBAT_ANIMATIONS,
  ...PERSONALITY_ANIMATIONS,
];
