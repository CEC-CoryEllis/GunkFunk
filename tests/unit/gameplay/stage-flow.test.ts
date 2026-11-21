import { describe, expect, it } from "vitest";
import { arenaInterior, findArenaGates } from "../../../src/gameplay/bosses/arena-gates";
import {
  ALL_GEMS_BONUS,
  ALL_SECRETS_BONUS,
  PAR_SECONDS,
  POINTS_PER_SECOND_SPARE,
  formatTime,
  tallyStage,
} from "../../../src/gameplay/stage/stage-tally";
import { groupCells } from "../../../src/levels/cell-regions";

const result = {
  title: "T",
  score: 1000,
  seconds: 100,
  gems: 3,
  gemsTotal: 5,
  secrets: 2,
  secretsTotal: 2,
};

describe("stage tally", () => {
  it("pays for time under par and for finding everything", () => {
    const tally = tallyStage(result);
    const time = (PAR_SECONDS - 100) * POINTS_PER_SECOND_SPARE;
    expect(tally.lines.map((l) => l.bonus)).toEqual([time, 0, ALL_SECRETS_BONUS]);
    expect(tally.bonus).toBe(time + ALL_SECRETS_BONUS);
    const perfect = tallyStage({ ...result, gems: 5 });
    expect(perfect.bonus).toBe(time + ALL_GEMS_BONUS + ALL_SECRETS_BONUS);
  });

  it("gives no time bonus over par and never shows more gems than the stage has", () => {
    const slow = tallyStage({ ...result, seconds: PAR_SECONDS + 50, gems: 7 });
    expect(slow.lines[0]!.bonus).toBe(0);
    expect(slow.lines[1]!.value).toBe("5/5");
  });

  it("leaves out categories a stage doesn't have (boss stages)", () => {
    const tally = tallyStage({ ...result, gemsTotal: 0, gems: 0, secretsTotal: 0, secrets: 0 });
    expect(tally.lines.map((l) => l.label)).toEqual(["TIME"]);
  });

  it("formats times as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.9)).toBe("1:05");
  });
});

/** A three-cell gate column at x = tx. */
const column = (tx: number) => [3, 4, 5].map((ty) => ({ tx, ty }));

describe("boss arenas", () => {
  const gates = groupCells([...column(2), ...column(10), ...column(30)]);

  it("use the nearest gate on each side of the boss", () => {
    const found = findArenaGates(gates, 8);
    expect(found?.entrance.minTx).toBe(2);
    expect(found?.exit.minTx).toBe(10);
    expect(findArenaGates(gates, 40)).toBeNull();
  });

  it("measure the interior between the gates, floor to ceiling", () => {
    const found = findArenaGates(gates, 8)!;
    expect(arenaInterior(found)).toEqual({ x: 48, y: 48, width: 7 * 16, height: 48 });
  });
});
