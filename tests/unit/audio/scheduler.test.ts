import { describe, expect, it } from "vitest";
import { compileSong } from "../../../src/audio/music/compile";
import { drums } from "../../../src/audio/music/dsl";
import {
  LookaheadScheduler,
  type SchedulerJob,
  type Timer,
} from "../../../src/audio/music/scheduler";
import { StepCursor } from "../../../src/audio/music/step-cursor";
import { stepDuration, stepTime } from "../../../src/audio/music/timing";

/** A fake audio clock + timer: `run(seconds)` fires due callbacks as time advances. */
class FakeTime implements Timer {
  now = 0;
  private queue: { at: number; callback: () => void; id: number }[] = [];
  private nextId = 1;
  set(callback: () => void, ms: number): unknown {
    const id = this.nextId++;
    this.queue.push({ at: this.now + ms / 1000, callback, id });
    return id;
  }
  clear(handle: unknown): void {
    this.queue = this.queue.filter((entry) => entry.id !== handle);
  }
  get pending(): number {
    return this.queue.length;
  }
  run(seconds: number): void {
    const end = this.now + seconds;
    for (;;) {
      this.queue.sort((a, b) => a.at - b.at);
      const next = this.queue[0];
      if (!next || next.at > end) break;
      this.queue.shift();
      this.now = next.at;
      next.callback();
    }
    this.now = end;
  }
}

const loopingSong = compileSong({
  bpm: 120,
  swing: 0.2,
  loop: true,
  layers: [{ name: "drums" }],
  sections: { A: { bars: 1, parts: [drums("drums", { hat: "xxxxxxxxxxxxxxxx" })] } },
  arrangement: ["A"],
});

/** Scheduler job that records which steps were scheduled and when. */
function recordingJob(
  cursor: StepCursor,
  log: { step: number; time: number; at: number }[],
  clock: FakeTime,
) {
  const job: SchedulerJob = {
    scheduleUntil(until, now) {
      cursor.advance(until, now - 0.02, (step, time) => log.push({ step, time, at: clock.now }));
      return true;
    },
  };
  return job;
}

describe("LookaheadScheduler", () => {
  it("schedules every step exactly once, ahead of the clock, at grid time", () => {
    const time = new FakeTime();
    const scheduler = new LookaheadScheduler({ now: () => time.now }, time, { tickMs: 25 });
    const log: { step: number; time: number; at: number }[] = [];
    const cursor = new StepCursor(loopingSong, 0.05);
    scheduler.add(recordingJob(cursor, log, time));
    time.run(4); // two bars at 120 BPM
    const positions = log.map((_, i) => i);
    expect(log.length).toBeGreaterThanOrEqual(32);
    log.forEach((entry, i) => {
      expect(entry.step).toBe(positions[i] % 16);
      expect(entry.time).toBeCloseTo(stepTime(0.05, i, 120, 0.2), 12);
      // Scheduled before it sounds, but no further ahead than lookahead + one tick.
      expect(entry.time).toBeGreaterThanOrEqual(entry.at);
      expect(entry.time - entry.at).toBeLessThanOrEqual(0.1 + 0.025 + 1e-9);
    });
    expect(new Set(log.map((e) => e.time)).size).toBe(log.length);
  });

  it("skips steps the clock has already passed instead of bursting them late", () => {
    const cursor = new StepCursor(loopingSong, 0);
    const visited: number[] = [];
    // The tab slept for one second: catch up without playing the backlog.
    cursor.advance(1.1, 1 - 0.02, (_, t) => visited.push(t));
    expect(visited).toEqual([1]); // only the step at t = 1.0 s (position 8) is still due
    expect(cursor.nextPosition).toBe(9);
  });

  it("drops finished jobs and stops its timer when idle", () => {
    const time = new FakeTime();
    const scheduler = new LookaheadScheduler({ now: () => time.now }, time);
    let calls = 0;
    scheduler.add({ scheduleUntil: () => ++calls < 3 });
    expect(scheduler.size).toBe(1);
    time.run(1);
    expect(calls).toBe(3);
    expect(scheduler.size).toBe(0);
    expect(scheduler.running).toBe(false);
    expect(time.pending).toBe(0);
  });

  it("uses a dynamic lookahead (e.g. longer while the tab is hidden)", () => {
    const time = new FakeTime();
    let hidden = false;
    const windows: number[] = [];
    const scheduler = new LookaheadScheduler({ now: () => time.now }, time, {
      lookahead: () => (hidden ? 1.5 : 0.1),
    });
    const job: SchedulerJob = {
      scheduleUntil: (until, now) => {
        windows.push(until - now);
        return true;
      },
    };
    scheduler.add(job);
    hidden = true;
    time.run(0.03);
    expect(windows[0]).toBeCloseTo(0.1, 12);
    expect(windows.at(-1)).toBeCloseTo(1.5, 12);
    scheduler.remove(job);
    expect(scheduler.running).toBe(false);
  });
});

describe("StepCursor", () => {
  it("reports the end of non-looping songs", () => {
    const once = compileSong({
      bpm: 150,
      loop: false,
      layers: [{ name: "drums" }],
      sections: { A: { bars: 1, steps: 8, parts: [drums("drums", { kick: "x..." })] } },
      arrangement: ["A"],
    });
    const cursor = new StepCursor(once, 0);
    const steps: number[] = [];
    expect(cursor.advance(100, 0, (step) => steps.push(step))).toBe("ended");
    expect(steps).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(cursor.timeOf(8)).toBeCloseTo(8 * stepDuration(150), 12);
  });
});
