/**
 * Lookahead scheduler: a coarse timer (~25 ms) wakes up and asks every job to
 * schedule its audio events up to `now + lookahead` on the precise audio clock.
 * The clock and timer are injected so the logic is testable with fakes.
 */

export interface SchedulerJob {
  /** Schedule everything starting before `until`; return false when finished. */
  scheduleUntil(until: number, now: number): boolean;
}

export interface Clock {
  now(): number;
}

export interface Timer {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface SchedulerOptions {
  tickMs?: number;
  /** Seconds to schedule ahead; a function so it can grow while the tab is hidden. */
  lookahead?: () => number;
}

const DEFAULT_TICK_MS = 25;
const DEFAULT_LOOKAHEAD = 0.1;

export class LookaheadScheduler {
  private readonly jobs = new Set<SchedulerJob>();
  private readonly tickMs: number;
  private readonly lookahead: () => number;
  private handle: unknown = null;

  constructor(
    private readonly clock: Clock,
    private readonly timer: Timer,
    options: SchedulerOptions = {},
  ) {
    this.tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.lookahead = options.lookahead ?? (() => DEFAULT_LOOKAHEAD);
  }

  get size(): number {
    return this.jobs.size;
  }

  get running(): boolean {
    return this.handle !== null;
  }

  /** Adds a job and immediately schedules its first window. */
  add(job: SchedulerJob): void {
    this.jobs.add(job);
    this.tick();
  }

  remove(job: SchedulerJob): void {
    this.jobs.delete(job);
    if (this.jobs.size === 0) this.stopTimer();
  }

  tick(): void {
    const now = this.clock.now();
    const until = now + this.lookahead();
    for (const job of this.jobs) {
      if (!job.scheduleUntil(until, now)) this.jobs.delete(job);
    }
    this.stopTimer();
    if (this.jobs.size > 0) this.handle = this.timer.set(() => this.tick(), this.tickMs);
  }

  private stopTimer(): void {
    if (this.handle === null) return;
    this.timer.clear(this.handle);
    this.handle = null;
  }
}
