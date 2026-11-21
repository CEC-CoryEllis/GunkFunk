import { describe, expect, it } from "vitest";
import { arenaInterior, findArenaGates } from "../../../src/gameplay/bosses/arena-gates";
import { FLUSH_HOUR } from "../../../src/levels/data/flush-hour";
import { THRONE_ROOM } from "../../../src/levels/data/throne-room";
import { groupCells } from "../../../src/levels/cell-regions";
import { parseLevel, terrainAt } from "../../../src/levels/level-parser";
import { getLevel } from "../../../src/levels/level-registry";

const level = parseLevel(THRONE_ROOM);
const cells = (kind: string) => level.spawns.filter((s) => s.kind === kind);

describe("The Throne Room", () => {
  it("follows Flush Hour and ends World 1", () => {
    expect(FLUSH_HOUR.next).toBe(THRONE_ROOM.id);
    expect(getLevel(FLUSH_HOUR.next!)).toBe(THRONE_ROOM);
    expect(THRONE_ROOM.next).toBeUndefined();
  });

  it("puts the Flush-o-Tron in an arena at least a screen wide", () => {
    const boss = level.spawns.find((s) => s.kind === "boss")!;
    expect(boss.boss).toBe("flushotron");
    const gates = findArenaGates(groupCells(cells("gate")), boss.tx)!;
    expect(gates).not.toBeNull();
    expect((gates.exit.maxTx - gates.entrance.minTx + 1) * 16).toBeGreaterThanOrEqual(384);
  });

  it("has fragile grates and a collapsing floor inside the arena, intact until the fight", () => {
    const boss = level.spawns.find((s) => s.kind === "boss")!;
    const inside = arenaInterior(findArenaGates(groupCells(cells("gate")), boss.tx)!);
    for (const kind of ["fragile", "collapse"]) {
      const marked = cells(kind);
      expect(marked.length).toBeGreaterThan(0);
      for (const c of marked) {
        expect(c.tx * 16).toBeGreaterThanOrEqual(inside.x);
        expect(c.tx * 16).toBeLessThan(inside.x + inside.width);
      }
    }
    expect(terrainAt(level, cells("fragile")[0]!.tx, cells("fragile")[0]!.ty)).toBe("oneWay");
    expect(terrainAt(level, cells("collapse")[0]!.tx, cells("collapse")[0]!.ty)).toBe("solid");
  });

  it("has a checkpoint right before the arena", () => {
    expect(cells("checkpoint")).toHaveLength(1);
  });
});
