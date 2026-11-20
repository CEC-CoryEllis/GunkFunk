import { describe, expect, it } from "vitest";
import {
  type Action,
  type ActionSnapshot,
  emptyActionRecord,
  nextSnapshot,
} from "../../../src/core/input/actions";
import {
  type BodySensors,
  MovementController,
} from "../../../src/gameplay/player/movement-controller";
import { DEFAULT_TUNING } from "../../../src/gameplay/player/movement-tuning";

const DT = 1 / 60;

/**
 * A tiny simulated world: flat floor at y = 0, optional wall at x = wallX.
 * Positive y is down, as on screen.
 */
class Sim {
  readonly controller = new MovementController({ ...DEFAULT_TUNING });
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  wallX = Number.POSITIVE_INFINITY;
  minY = 0;
  private held = emptyActionRecord();
  events: string[] = [];

  sensors(): BodySensors {
    return {
      vx: this.vx,
      vy: this.vy,
      onFloor: this.y >= 0 && this.vy >= 0,
      onPassThrough: false,
      wallLeft: false,
      wallRight: this.x >= this.wallX - 0.01,
      onLadder: false,
      ladderBelow: false,
      ladderX: 0,
      ceilingLow: false,
    };
  }

  step(hold: Action[] = []): void {
    const held = emptyActionRecord();
    for (const a of hold) held[a] = true;
    const moveX = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const input: ActionSnapshot = nextSnapshot(this.held, held, moveX, 0);
    this.held = held;
    const out = this.controller.update(input, this.sensors(), DT);
    this.events.push(...out.events);
    this.vx = out.vx;
    this.vy = out.vy;
    this.x = Math.min(this.x + this.vx * DT, this.wallX);
    if (this.x >= this.wallX) this.vx = 0;
    this.y += this.vy * DT;
    if (this.y > 0) {
      this.y = 0;
      this.vy = 0;
    }
    this.minY = Math.min(this.minY, this.y);
  }

  run(frames: number, hold: Action[] = []): void {
    for (let i = 0; i < frames; i++) this.step(hold);
  }

  /** Steps until landed (or a frame limit), returning frames taken. */
  untilLanded(hold: Action[] = [], limit = 300): number {
    let n = 0;
    do {
      this.step(hold);
      n++;
    } while (!(this.y === 0 && this.vy === 0) && n < limit);
    return n;
  }
}

function grounded(): Sim {
  const sim = new Sim();
  sim.run(2);
  return sim;
}

describe("MovementController", () => {
  it("full jump clears about four tiles and a tap jump is much lower", () => {
    const full = grounded();
    full.step(["jump"]);
    full.untilLanded(["jump"]);
    const fullHeight = -full.minY;
    expect(fullHeight).toBeGreaterThan(60);
    expect(fullHeight).toBeLessThan(90);

    const tap = grounded();
    tap.step(["jump"]);
    tap.step([]);
    tap.untilLanded();
    expect(-tap.minY).toBeLessThan(fullHeight * 0.6);
  });

  it("accelerates to run speed and stops quickly", () => {
    const sim = grounded();
    sim.run(30, ["right"]);
    expect(sim.vx).toBeCloseTo(DEFAULT_TUNING.runSpeed, 0);
    sim.run(8);
    expect(sim.vx).toBe(0);
  });

  it("buffers a jump pressed just before landing", () => {
    const sim = grounded();
    sim.step(["jump"]);
    sim.run(10, ["jump"]);
    sim.step([]);
    sim.step(["jump"]); // spend the double jump
    expect(sim.events).toContain("doubleJump");
    // Fall until a few pixels above the floor, then press jump (no air jumps left).
    let guard = 0;
    while (!(sim.vy > 0 && sim.y > -8) && guard++ < 300) sim.step([]);
    sim.events = [];
    sim.step(["jump"]);
    expect(sim.events).not.toContain("jump");
    guard = 0;
    while (!sim.events.includes("jump") && guard++ < 10) sim.step(["jump"]);
    expect(sim.events.some((e) => e === "land" || e === "hardLand")).toBe(true);
    expect(sim.events).toContain("jump");
  });

  it("allows a jump during coyote time after walking off a ledge", () => {
    const sim = grounded();
    sim.run(10, ["right"]);
    // Walk off: put the body in the air without jumping.
    sim.y = -1;
    sim.vy = 1;
    sim.step(["right"]);
    sim.step(["right"]);
    sim.events = [];
    sim.step(["right", "jump"]);
    expect(sim.events).toContain("jump");
    expect(sim.events).not.toContain("doubleJump");
  });

  it("refuses a ground jump after coyote time expires (uses the double jump instead)", () => {
    const sim = grounded();
    sim.y = -50;
    sim.vy = 1;
    sim.run(12);
    sim.events = [];
    sim.step(["jump"]);
    expect(sim.events).toEqual(["doubleJump"]);
    sim.events = [];
    sim.step([]);
    sim.step(["jump"]);
    expect(sim.events).toEqual([]);
  });

  it("wall slides slowly and wall jumps away from the wall", () => {
    const sim = grounded();
    sim.wallX = 20;
    sim.step(["jump"]);
    sim.run(40, ["right", "jump"]);
    expect(sim.controller.state).toBe("wallSlide");
    expect(sim.vy).toBeLessThanOrEqual(DEFAULT_TUNING.wallSlideSpeed);
    sim.events = [];
    sim.step([]);
    sim.step(["jump", "right"]);
    expect(sim.events).toContain("wallJump");
    expect(sim.vx).toBeLessThan(0);
    expect(sim.vy).toBeLessThan(0);
  });

  it("turns a crouch at speed into a slide", () => {
    const sim = grounded();
    sim.run(30, ["right"]);
    sim.step(["right", "down"]);
    expect(sim.events).toContain("slideStart");
    expect(sim.controller.state).toBe("slide");
    expect(sim.vx).toBeGreaterThan(DEFAULT_TUNING.runSpeed);
  });

  it("rises off the floor in a strong updraft, capped at a gentle speed", () => {
    const sim = grounded();
    for (let i = 0; i < 40; i++) {
      sim.controller.addLift(1900);
      sim.step();
      expect(sim.vy).toBeGreaterThanOrEqual(-300);
    }
    expect(sim.controller.state).toBe("air");
    expect(sim.y).toBeLessThan(-60);
  });

  it("stays planted when the lift is weaker than gravity", () => {
    const sim = grounded();
    for (let i = 0; i < 20; i++) {
      sim.controller.addLift(DEFAULT_TUNING.gravity * 0.5);
      sim.step();
    }
    expect(sim.controller.state).toBe("ground");
    expect(sim.y).toBe(0);
  });

  it("crouches in place when slow", () => {
    const sim = grounded();
    sim.run(5, ["down"]);
    expect(sim.controller.crouching).toBe(true);
    expect(sim.controller.state).toBe("ground");
  });
});
