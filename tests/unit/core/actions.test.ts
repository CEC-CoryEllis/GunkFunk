import { describe, expect, it } from "vitest";
import { emptyActionRecord, nextSnapshot } from "../../../src/core/input/actions";

describe("nextSnapshot", () => {
  it("reports a press only on the frame it goes down, and a release on the frame it goes up", () => {
    const up = emptyActionRecord();
    const down = { ...emptyActionRecord(), jump: true };

    const first = nextSnapshot(up, down, 0, 0);
    expect(first.pressed.jump).toBe(true);
    expect(first.held.jump).toBe(true);

    const second = nextSnapshot(down, { ...down }, 0, 0);
    expect(second.pressed.jump).toBe(false);
    expect(second.held.jump).toBe(true);

    const third = nextSnapshot(down, up, 0, 0);
    expect(third.released.jump).toBe(true);
    expect(third.held.jump).toBe(false);
  });

  it("passes analog axes through untouched", () => {
    const snap = nextSnapshot(emptyActionRecord(), emptyActionRecord(), -0.5, 0.75);
    expect(snap.moveX).toBe(-0.5);
    expect(snap.moveY).toBe(0.75);
  });
});
