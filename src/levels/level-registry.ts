import { DEBUG } from "../config/display";
import { FLUSH_HOUR } from "./data/flush-hour";
import { SEWER_TEST_LEVEL } from "./data/sewer-test-level";
import { THRONE_ROOM } from "./data/throne-room";
import { TRAINING_ARENA } from "./data/training-arena";
import type { LevelDefinition } from "./level-format";

const LEVELS: readonly LevelDefinition[] = [
  FLUSH_HOUR,
  THRONE_ROOM,
  SEWER_TEST_LEVEL,
  TRAINING_ARENA,
];

export const FIRST_LEVEL_ID = FLUSH_HOUR.id;

/** Every registered stage (level-design lint tests iterate these). */
export function allLevels(): readonly LevelDefinition[] {
  return LEVELS;
}

export function getLevel(id: string): LevelDefinition {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level "${id}"`);
  return level;
}

/**
 * The stage "Start game" opens. Debug builds accept `?stage=<id>` so tests and
 * developers can jump straight to a sandbox.
 */
export function startingLevelId(): string {
  if (!DEBUG) return FIRST_LEVEL_ID;
  const requested = new URLSearchParams(window.location.search).get("stage");
  return requested && LEVELS.some((l) => l.id === requested) ? requested : FIRST_LEVEL_ID;
}
