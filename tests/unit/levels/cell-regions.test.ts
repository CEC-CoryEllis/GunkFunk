import { describe, expect, it } from "vitest";
import { groupCells } from "../../../src/levels/cell-regions";

describe("groupCells", () => {
  it("groups 4-connected cells and reports their bounds", () => {
    const regions = groupCells([
      { tx: 1, ty: 1 },
      { tx: 2, ty: 1 },
      { tx: 2, ty: 2 },
      { tx: 5, ty: 5 },
    ]);
    expect(regions).toHaveLength(2);
    expect(regions[0]).toMatchObject({ minTx: 1, minTy: 1, maxTx: 2, maxTy: 2 });
    expect(regions[0]!.cells).toHaveLength(3);
    expect(regions[1]).toMatchObject({ minTx: 5, minTy: 5, maxTx: 5, maxTy: 5 });
  });

  it("doesn't join cells that only touch diagonally", () => {
    expect(
      groupCells([
        { tx: 0, ty: 0 },
        { tx: 1, ty: 1 },
      ]),
    ).toHaveLength(2);
  });

  it("returns nothing for no cells", () => {
    expect(groupCells([])).toEqual([]);
  });
});
