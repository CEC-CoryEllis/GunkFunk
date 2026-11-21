import { describe, expect, it } from "vitest";
import {
  CLOG_PHASES,
  type ClogCue,
  ClogBrain,
  ROLL_MAX_SECONDS,
  SPIT_SECONDS,
  WAKE_SECONDS,
} from "../../../src/gameplay/bosses/clog-brain";

const DT = 1 / 60;

/** Runs the brain until `until` returns true (or a step limit), collecting cues. */
function runUntil(
  brain: ClogBrain,
  until: (b: ClogBrain) => boolean,
  options: { health?: number; bump?: boolean; limit?: number } = {},
): ClogCue[] {
  const cues: ClogCue[] = [];
  for (let i = 0; i < (options.limit ?? 2000) && !until(brain); i++) {
    const bump = options.bump === true && brain.action === "roll" && brain.time > 0.3;
    cues.push(...brain.update(DT, options.health ?? 1, bump));
  }
  return cues;
}

describe("ClogBrain", () => {
  it("sleeps until woken, roars, then idles", () => {
    const brain = new ClogBrain();
    expect(brain.update(5, 1, false)).toEqual([]);
    expect(brain.action).toBe("dormant");
    expect(brain.wake()).toEqual(["roar"]);
    brain.update(WAKE_SECONDS + 0.01, 1, false);
    expect(brain.action).toBe("idle");
  });

  it("winds up and rolls; hitting a wall leaves it stunned and exposed", () => {
    const brain = new ClogBrain();
    brain.wake();
    const cues = runUntil(brain, (b) => b.action === "stunned", { bump: true });
    expect(cues).toContain("rollStart");
    expect(cues).toContain("bonk");
    expect(brain.exposed).toBe(true);
    expect(brain.dangerous).toBe(false);
    runUntil(brain, (b) => b.action !== "stunned");
    expect(brain.action).toBe("idle");
  });

  it("gives up a roll that never reaches a wall", () => {
    const brain = new ClogBrain();
    brain.wake();
    runUntil(brain, (b) => b.action === "roll");
    runUntil(brain, (b) => b.action !== "roll", { limit: Math.ceil(ROLL_MAX_SECONDS / DT) + 5 });
    expect(brain.action).toBe("idle");
  });

  it("alternates rolls and spits, firing once per spit", () => {
    const brain = new ClogBrain();
    brain.wake();
    runUntil(brain, (b) => b.action === "stunned", { bump: true });
    const cues = runUntil(brain, (b) => b.action === "spit");
    expect(brain.action).toBe("spit");
    const spitCues = runUntil(brain, (b) => b.action !== "spit", {
      limit: Math.ceil(SPIT_SECONDS / DT) + 5,
    });
    expect([...cues, ...spitCues].filter((c) => c === "spit")).toHaveLength(1);
  });

  it("enrages at half health: faster rolls that rebound once, more hairballs, rats", () => {
    const brain = new ClogBrain();
    brain.wake();
    const cues = runUntil(brain, () => false, { health: 0.4, bump: true, limit: 60 * 40 });
    expect(cues).toContain("enraged");
    expect(brain.phase).toBe(2);
    expect(cues).toContain("rebound");
    expect(cues).toContain("cough");
    expect(CLOG_PHASES[2].rollSpeed).toBeGreaterThan(CLOG_PHASES[1].rollSpeed);
    expect(CLOG_PHASES[2].spitCount).toBeGreaterThan(CLOG_PHASES[1].spitCount);
  });

  it("stops thinking once defeated and resets to sleep", () => {
    const brain = new ClogBrain();
    brain.wake();
    brain.defeat();
    expect(brain.update(1, 0, false)).toEqual([]);
    brain.reset();
    expect(brain.action).toBe("dormant");
    expect(brain.phase).toBe(1);
  });
});
