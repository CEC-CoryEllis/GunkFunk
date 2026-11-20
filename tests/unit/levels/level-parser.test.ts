import { describe, expect, it } from "vitest";
import { SEWER_TEST_LEVEL } from "../../../src/levels/data/sewer-test-level";
import type { LevelDefinition } from "../../../src/levels/level-format";
import {
  LevelParseError,
  horizontalRuns,
  parseLevel,
  secretCells,
  solidMask,
  terrainAt,
} from "../../../src/levels/level-parser";

function level(rows: string[]): LevelDefinition {
  return { id: "t", title: "T", subtitle: "", theme: "sewer", music: "sewer", rows };
}

describe("parseLevel", () => {
  it("parses terrain and the player start", () => {
    const parsed = parseLevel(level(["#####", "#P.-#", "#~~^#", "#####"]));
    expect(parsed.widthTiles).toBe(5);
    expect(parsed.playerStart).toEqual({ tx: 1, ty: 1 });
    expect(terrainAt(parsed, 1, 1)).toBe("empty");
    expect(terrainAt(parsed, 3, 1)).toBe("oneWay");
    expect(terrainAt(parsed, 1, 2)).toBe("sludge");
    expect(terrainAt(parsed, 3, 2)).toBe("spikes");
  });

  it("treats outside the map as solid except above it", () => {
    const parsed = parseLevel(level(["P"]));
    expect(terrainAt(parsed, -1, 0)).toBe("solid");
    expect(terrainAt(parsed, 0, 1)).toBe("solid");
    expect(terrainAt(parsed, 0, -1)).toBe("empty");
  });

  it("rejects unknown characters and missing/duplicate starts", () => {
    expect(() => parseLevel(level(["P?"]))).toThrow(LevelParseError);
    expect(() => parseLevel(level(["..."]))).toThrow(/player start/);
    expect(() => parseLevel(level(["PP"]))).toThrow(/found 2/);
  });

  it("puts prop and region markers on the right terrain", () => {
    const parsed = parseLevel(level(["P*%X", "==:$", "####"]));
    const at = (tx: number, ty: number) => parsed.spawns.find((s) => s.tx === tx && s.ty === ty);
    expect(at(1, 0)?.kind).toBe("secret");
    expect(terrainAt(parsed, 1, 0)).toBe("empty");
    // Cracked walls are solid until they're smashed.
    expect(at(2, 0)?.kind).toBe("crackedWall");
    expect(terrainAt(parsed, 2, 0)).toBe("solid");
    expect(at(3, 0)).toMatchObject({ kind: "prop", prop: "crate" });
    expect(at(0, 1)).toMatchObject({ kind: "prop", prop: "platform" });
    expect(at(2, 1)?.kind).toBe("platformStop");
    expect(at(3, 1)).toMatchObject({ kind: "prop", prop: "gem" });
    expect(at(2, 0)).not.toHaveProperty("terrain");
  });

  it("counts items inside a secret room as part of it, but not items outside", () => {
    const parsed = parseLevel(level(["P$.**", "..*$*", "#####"]));
    const cells = secretCells(parsed).map((c) => `${c.tx},${c.ty}`);
    expect(new Set(cells)).toEqual(new Set(["2,1", "3,0", "3,1", "4,0", "4,1"]));
  });

  it("computes autotile masks", () => {
    const parsed = parseLevel(level(["P...", ".##.", ".##.", "...."]));
    // Top-left of the 2x2 block: solid neighbours to the east and south.
    expect(solidMask(parsed, 1, 1)).toBe(2 | 4);
    expect(solidMask(parsed, 2, 2)).toBe(1 | 8);
  });

  it("groups horizontal hazard runs", () => {
    const parsed = parseLevel(level(["P.~~.~", "......"]));
    expect(horizontalRuns(parsed, "sludge")).toEqual([
      { tx: 2, ty: 0, length: 2 },
      { tx: 5, ty: 0, length: 1 },
    ]);
  });

  it("parses the shipped test level with rectangular rows", () => {
    const parsed = parseLevel(SEWER_TEST_LEVEL);
    expect(new Set(SEWER_TEST_LEVEL.rows.map((r) => r.length)).size).toBe(1);
    expect(parsed.heightTiles).toBe(18);
  });
});
