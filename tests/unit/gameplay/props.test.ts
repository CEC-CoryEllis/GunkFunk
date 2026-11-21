import { describe, expect, it } from "vitest";
import type { HitInfo } from "../../../src/gameplay/combat/hit-types";
import { platformPath } from "../../../src/gameplay/props/platform-path";
import { breaksWall, rollSurprise } from "../../../src/gameplay/props/prop-rules";
import type { CellRegion } from "../../../src/levels/cell-regions";

function platformAt(tx: number, ty: number): CellRegion {
  return {
    cells: [
      { tx, ty },
      { tx: tx + 1, ty },
    ],
    minTx: tx,
    minTy: ty,
    maxTx: tx + 1,
    maxTy: ty,
  };
}

function hit(overrides: Partial<HitInfo>): HitInfo {
  return {
    key: "k",
    team: "player",
    kind: "melee",
    damage: 1,
    knockbackX: 0,
    knockbackY: 0,
    x: 0,
    y: 0,
    impact: 0.3,
    ...overrides,
  };
}

describe("platformPath", () => {
  it("shuttles sideways between stops in its row, right edge reaching the right stop", () => {
    // ..:==....:   platform at 3-4, stops at 2 and 9
    const path = platformPath(platformAt(3, 5), [
      { tx: 2, ty: 5 },
      { tx: 9, ty: 5 },
    ]);
    expect(path).toEqual({ from: { tx: 2, ty: 5 }, to: { tx: 8, ty: 5 } });
  });

  it("uses its own spot as an end when every stop is on one side", () => {
    const path = platformPath(platformAt(3, 5), [{ tx: 10, ty: 5 }]);
    expect(path).toEqual({ from: { tx: 3, ty: 5 }, to: { tx: 9, ty: 5 } });
  });

  it("goes up and down when its stops are in its columns", () => {
    const path = platformPath(platformAt(3, 9), [{ tx: 4, ty: 2 }]);
    expect(path).toEqual({ from: { tx: 3, ty: 2 }, to: { tx: 3, ty: 9 } });
  });

  it("has no path without a stop", () => {
    expect(platformPath(platformAt(3, 9), [{ tx: 20, ty: 2 }])).toBeNull();
  });
});

describe("cracked walls", () => {
  it("only give way to heavy hits, explosions and bowled bodies", () => {
    expect(breaksWall(hit({ impact: 0.3 }))).toBe(false);
    expect(breaksWall(hit({ kind: "projectile", impact: 0.8 }))).toBe(false);
    expect(breaksWall(hit({ impact: 1 }))).toBe(true);
    expect(breaksWall(hit({ kind: "explosion", impact: 0.5 }))).toBe(true);
    expect(breaksWall(hit({ kind: "launched", impact: 0.5 }))).toBe(true);
  });
});

describe("trash can surprises", () => {
  it("are mostly food, sometimes a rat and rarely a gem", () => {
    expect(rollSurprise(0)).toBe("snack");
    expect(rollSurprise(0.49)).toBe("snack");
    expect(rollSurprise(0.5)).toBe("rat");
    expect(rollSurprise(0.84)).toBe("rat");
    expect(rollSurprise(0.85)).toBe("gem");
    expect(rollSurprise(0.999)).toBe("gem");
  });
});
