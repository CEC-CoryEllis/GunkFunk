import { describe, expect, it } from "vitest";
import { FLUSH_HOUR } from "../../../src/levels/data/flush-hour";
import { groupCells } from "../../../src/levels/cell-regions";
import { parseLevel, secretCells, terrainAt } from "../../../src/levels/level-parser";
import { FIRST_LEVEL_ID } from "../../../src/levels/level-registry";

const level = parseLevel(FLUSH_HOUR);
const count = (predicate: (s: (typeof level.spawns)[number]) => boolean) =>
  level.spawns.filter(predicate).length;

describe("Flush Hour", () => {
  it("is the stage START opens", () => {
    expect(FIRST_LEVEL_ID).toBe(FLUSH_HOUR.id);
  });

  it("has the promised collectibles: five gems, two secrets, a weapon cache", () => {
    expect(count((s) => s.prop === "gem")).toBe(5);
    expect(groupCells(secretCells(level))).toHaveLength(2);
    expect(count((s) => s.kind === "weaponPickup")).toBeGreaterThanOrEqual(3);
    expect(count((s) => s.kind === "powerUp")).toBeGreaterThanOrEqual(2);
  });

  it("has checkpoints spread through it, a boss arena and an exit at the end", () => {
    const checkpoints = level.spawns.filter((s) => s.kind === "checkpoint").map((s) => s.tx);
    expect(checkpoints.length).toBe(4);
    const boss = level.spawns.find((s) => s.kind === "boss")!;
    const exit = level.spawns.find((s) => s.kind === "exit")!;
    expect(boss.boss).toBe("clog");
    expect(exit.tx).toBeGreaterThan(boss.tx);
    // A checkpoint right before the boss so a failed fight is a short walk back.
    expect(Math.max(...checkpoints)).toBeGreaterThan(boss.tx - 40);
    expect(Math.max(...checkpoints)).toBeLessThan(boss.tx);
  });

  it("keeps gate cells open until a fight closes them", () => {
    for (const gate of level.spawns.filter((s) => s.kind === "gate")) {
      expect(terrainAt(level, gate.tx, gate.ty)).toBe("empty");
    }
  });
});
