import { describe, expect, it } from "vitest";
import type { LevelDefinition } from "../../../src/levels/level-format";
import { findHeadroomTraps } from "../../../src/levels/level-lint";
import { parseLevel } from "../../../src/levels/level-parser";
import { allLevels } from "../../../src/levels/level-registry";

function level(rows: string[]): LevelDefinition {
  return { id: "t", title: "T", subtitle: "", theme: "sewer", music: "sewer", rows };
}

describe("findHeadroomTraps", () => {
  it("flags a ledge you can stand on but not jump onto", () => {
    const parsed = parseLevel(level(["######", "......", "......", "..##..", "P.....", "######"]));
    expect(findHeadroomTraps(parsed)).toEqual([
      { tx: 2, ty: 3, headroom: 2 },
      { tx: 3, ty: 3, headroom: 2 },
    ]);
  });

  it("allows one-tile crawlspaces and roomy ledges", () => {
    const crawl = parseLevel(level(["######", "######", "P.....", "######"]));
    const roomy = parseLevel(
      level(["######", "......", "......", "......", "......", "..##..", "P.....", "######"]),
    );
    expect(findHeadroomTraps(crawl)).toEqual([]);
    expect(findHeadroomTraps(roomy)).toEqual([]);
  });

  it("treats grates and ladder tops as standable", () => {
    const parsed = parseLevel(
      level(["######", "......", "......", "..-H..", "...H..", "P..H..", "######"]),
    );
    expect(findHeadroomTraps(parsed).map((t) => t.tx)).toEqual([2, 3]);
  });
});

describe("shipped levels", () => {
  for (const definition of allLevels()) {
    it(`${definition.id} has no headroom traps`, () => {
      expect(findHeadroomTraps(parseLevel(definition))).toEqual([]);
    });
  }
});
