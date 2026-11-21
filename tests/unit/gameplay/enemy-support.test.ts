import { describe, expect, it } from "vitest";
import {
  COMBO_WINDOW_SECONDS,
  KillCombo,
  MAX_COMBO_MULTIPLIER,
} from "../../../src/gameplay/scoring/kill-combo";
import { FIGHT_LINGER_SECONDS, MusicDirector } from "../../../src/gameplay/stage/music-director";
import { lobVelocity } from "../../../src/gameplay/weapons/projectile-motion";

describe("KillCombo", () => {
  it("multiplies knockouts that land inside the window, capped", () => {
    const combo = new KillCombo();
    const multipliers = [0, 1, 2, 3, 4, 5, 6].map((i) => combo.registerKill(i * 0.5));
    expect(multipliers).toEqual([1, 2, 3, 4, 5, 5, 5]);
    expect(Math.max(...multipliers)).toBe(MAX_COMBO_MULTIPLIER);
  });

  it("resets once the window lapses", () => {
    const combo = new KillCombo();
    combo.registerKill(0);
    combo.registerKill(1);
    expect(combo.activeChain(1 + COMBO_WINDOW_SECONDS + 0.01)).toBe(0);
    expect(combo.registerKill(1 + COMBO_WINDOW_SECONDS + 0.01)).toBe(1);
  });
});

describe("MusicDirector", () => {
  it("brings in the full band when a fight starts and lingers after it ends", () => {
    const music = new MusicDirector(1);
    expect(music.update(0.5, 1)).toBeNull();
    expect(music.update(0.5, 3)).toBe(2);
    expect(music.update(0.5, 3)).toBeNull();
    let changed: number | null = null;
    let elapsed = 0;
    while (changed === null && elapsed < 10) {
      changed = music.update(0.5, 0);
      elapsed += 0.5;
    }
    expect(changed).toBe(1);
    expect(elapsed).toBeCloseTo(FIGHT_LINGER_SECONDS, 5);
  });
});

describe("lobVelocity", () => {
  const gravity = 600;

  /** Simulates the throw and returns the height when it reaches the target's x. */
  function heightAtTarget(dx: number, v: { vx: number; vy: number }): number {
    const t = dx / v.vx;
    return v.vy * t + 0.5 * gravity * t * t;
  }

  it("lands the bomb on targets at the same height, above and below", () => {
    for (const [dx, dy] of [
      [120, 0],
      [-150, 0],
      [100, -40],
      [160, 30],
    ] as const) {
      const v = lobVelocity(dx, dy, gravity, 55);
      expect(v).not.toBeNull();
      expect(Math.sign(v!.vx)).toBe(Math.sign(dx));
      expect(heightAtTarget(dx, v!)).toBeCloseTo(dy, 3);
    }
  });

  it("refuses impossible throws", () => {
    expect(lobVelocity(10, -100, gravity, 20)).toBeNull();
    expect(lobVelocity(0, 0, gravity, 45)).toBeNull();
  });
});
