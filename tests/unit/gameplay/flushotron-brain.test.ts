import { describe, expect, it } from "vitest";
import {
  FlushOTronBrain,
  PHASE_FLOOR,
  TRON_ACTIONS,
  TRON_MAX_HEALTH,
  TRON_PATTERNS,
  type TronCue,
} from "../../../src/gameplay/bosses/flushotron-brain";

const DT = 1 / 60;

function run(brain: FlushOTronBrain, seconds: number, health = TRON_MAX_HEALTH): TronCue[] {
  const cues: TronCue[] = [];
  for (let t = 0; t < seconds; t += DT) cues.push(...brain.update(DT, health));
  return cues;
}

function runUntil(
  brain: FlushOTronBrain,
  until: () => boolean,
  health = TRON_MAX_HEALTH,
): TronCue[] {
  const cues: TronCue[] = [];
  for (let i = 0; i < 60 * 60 && !until(); i++) cues.push(...brain.update(DT, health));
  return cues;
}

describe("FlushOTronBrain", () => {
  it("waits, then plays its intro untouchable before the first attack", () => {
    const brain = new FlushOTronBrain();
    expect(run(brain, 3)).toEqual([]);
    brain.wake();
    expect(brain.action).toBe("intro");
    expect(brain.invulnerable).toBe(true);
    const cues = run(brain, TRON_ACTIONS.intro.duration + DT);
    expect(cues).toEqual(["taunt1", "taunt2", "nameCard"]);
    expect(brain.action).toBe(TRON_PATTERNS[1][0]);
  });

  it("works through phase 1's pattern and only exposes itself while venting", () => {
    const brain = new FlushOTronBrain();
    brain.wake();
    const seen = new Set<string>();
    const cues = runUntil(brain, () => {
      seen.add(brain.action);
      if (brain.action !== "vent") expect(brain.exposed).toBe(false);
      return brain.action === "vent";
    });
    expect([...seen]).toEqual(expect.arrayContaining(["walk", "stomp", "plunge", "lob"]));
    expect(cues).toEqual(expect.arrayContaining(["stompSlam", "plungeOut", "lobShot"]));
    expect(cues.filter((c) => c === "lobShot")).toHaveLength(3);
    expect(brain.exposed).toBe(true);
    expect(brain.dangerous).toBe(false);
  });

  it("breaks down at each phase floor, wrecking the arena on cue", () => {
    const brain = new FlushOTronBrain();
    brain.wake();
    run(brain, 5);
    let cues = brain.update(DT, PHASE_FLOOR[1]);
    expect(brain.action).toBe("breakdown1");
    expect(brain.invulnerable).toBe(true);
    cues = [...cues, ...runUntil(brain, () => brain.phase === 2, PHASE_FLOOR[1])];
    expect(cues).toEqual(expect.arrayContaining(["legsOff", "gratesSmash"]));
    expect(brain.action).toBe(TRON_PATTERNS[2][0]);

    run(brain, 0.5, PHASE_FLOOR[1]);
    cues = runUntil(brain, () => brain.phase === 3, PHASE_FLOOR[2]);
    expect(cues).toEqual(["crash", "floorCollapse", "lidOff", "hopStart"]);
    expect(brain.action).toBe(TRON_PATTERNS[3][0]);
  });

  it("overheats in phase 2 and has no armour at all in phase 3", () => {
    const brain = new FlushOTronBrain();
    brain.wake();
    run(brain, 5);
    brain.update(DT, PHASE_FLOOR[1]);
    runUntil(brain, () => brain.phase === 2, PHASE_FLOOR[1]);
    runUntil(brain, () => brain.action === "overheat", PHASE_FLOOR[1] - 1);
    expect(brain.exposed).toBe(true);
    brain.update(DT, PHASE_FLOOR[2]);
    runUntil(brain, () => brain.phase === 3, PHASE_FLOOR[2]);
    const cues = run(brain, 6, 10);
    expect(cues).toEqual(expect.arrayContaining(["hopStart", "flaskThrow", "missileFire"]));
    expect(brain.exposed).toBe(true);
    expect(brain.healthFloor).toBe(0);
  });

  it("goes quiet when defeated and back to sleep on reset", () => {
    const brain = new FlushOTronBrain();
    brain.wake();
    brain.defeat();
    expect(run(brain, 2)).toEqual([]);
    brain.reset();
    expect(brain.action).toBe("dormant");
    expect(brain.phase).toBe(1);
  });
});
