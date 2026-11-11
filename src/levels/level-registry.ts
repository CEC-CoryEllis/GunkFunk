import { SEWER_TEST_LEVEL } from "./data/sewer-test-level";
import type { LevelDefinition } from "./level-format";

const LEVELS: readonly LevelDefinition[] = [SEWER_TEST_LEVEL];

export const FIRST_LEVEL_ID = SEWER_TEST_LEVEL.id;

export function getLevel(id: string): LevelDefinition {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level "${id}"`);
  return level;
}
