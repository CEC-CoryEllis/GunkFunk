import { describe, expect, it } from "vitest";
import { SEWER_TEST_LEVEL } from "../../../src/levels/data/sewer-test-level";
import type { LevelDefinition } from "../../../src/levels/level-format";
import {
  LevelParseError,
  horizontalRuns,
  parseLevel,
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
