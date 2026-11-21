import { describe, expect, it } from "vitest";
import {
  BALL_TUNING,
  type BallEvent,
  BallController,
} from "../../../src/gameplay/player/forms/ball-controller";
import type { BodySensors } from "../../../src/gameplay/player/movement-controller";

const DT = 1 / 60;

/** Flat floor at y = 0 (positive y is down), optional wall on the right at wallX. */
class BallSim {
  readonly ball = new BallController();
  x = 0;
  y = 0;
  wallX = Number.POSITIVE_INFINITY;
  minY = 0;
  events: BallEvent[] = [];
  private vy = 0;

  sensors(): BodySensors {
    return {
      vx: 0,
      vy: this.vy,
      onFloor: this.y >= 0,
      onPassThrough: false,
      wallLeft: false,
      wallRight: this.x >= this.wallX - 0.01,
      onLadder: false,
      ladderBelow: false,
      ladderX: 0,
      ceilingLow: false,
    };
  }

  step(moveX = 0, jump = false, down = false): { vx: number; vy: number } {
    const out = this.ball.update(
      { moveX, jumpPressed: jump, downPressed: down },
      this.sensors(),
      DT,
    );
    this.events.push(...out.events);
    this.x = Math.min(this.x + out.vx * DT, this.wallX);
    this.y += out.vy * DT;
    this.vy = out.vy;
    if (this.y > 0) {
      this.y = 0;
      this.vy = 0;
    }
    this.minY = Math.min(this.minY, this.y);
    return out;
  }

  run(frames: number, moveX = 0): { vx: number; vy: number } {
    let out = { vx: 0, vy: 0 };
    for (let i = 0; i < frames; i++) out = this.step(moveX);
    return out;
  }
}

describe("BallController", () => {
  it("builds up to top speed and keeps rolling on momentum", () => {
    const sim = new BallSim();
    const fast = sim.run(90, 1);
    expect(fast.vx).toBeCloseTo(BALL_TUNING.maxSpeed, 0);
    const coasting = sim.run(30, 0);
    expect(coasting.vx).toBeGreaterThan(BALL_TUNING.maxSpeed * 0.75);
  });

  it("jumps about six tiles high", () => {
    const sim = new BallSim();
    sim.run(2);
    sim.step(0, true);
    sim.run(90);
    expect(-sim.minY).toBeGreaterThan(85);
    expect(-sim.minY).toBeLessThan(110);
    expect(sim.events).toContain("jump");
  });

  it("bounces after a big drop and settles after a small one", () => {
    const big = new BallSim();
    big.y = -150;
    big.ball.reset(0, 1, 1);
    big.run(60);
    expect(big.events).toContain("bounce");

    const small = new BallSim();
    small.y = -10;
    small.ball.reset(0, 1, 1);
    small.run(30);
    expect(small.events).not.toContain("bounce");
    expect(small.events).toContain("land");
  });

  it("rebounds off a wall it hits fast, but not off one it's resting against", () => {
    const sim = new BallSim();
    sim.wallX = 200;
    sim.run(90, 1);
    expect(sim.events).toContain("wallBounce");

    const leaning = new BallSim();
    leaning.wallX = 2;
    leaning.run(60, 1);
    expect(leaning.events).not.toContain("wallBounce");
  });

  it("ground-pounds from the air and rebounds on landing", () => {
    const sim = new BallSim();
    sim.run(2);
    sim.step(0, true);
    sim.run(10);
    const slam = sim.step(0, false, true);
    expect(sim.ball.slamming).toBe(true);
    expect(slam.vy).toBeGreaterThan(BALL_TUNING.maxFallSpeed);
    sim.run(40);
    expect(sim.events).toContain("slamLand");
    expect(sim.ball.slamming).toBe(false);
  });

  it("can't ground-pound from the floor", () => {
    const sim = new BallSim();
    sim.run(2);
    sim.step(0, false, true);
    expect(sim.ball.slamming).toBe(false);
  });

  it("rides updrafts and launches", () => {
    const sim = new BallSim();
    sim.run(2);
    for (let i = 0; i < 40; i++) {
      sim.ball.addLift(2300);
      sim.step();
    }
    expect(sim.y).toBeLessThan(-40);
    const launched = new BallSim();
    launched.run(2);
    launched.ball.launch(560);
    expect(launched.step().vy).toBeLessThan(-500);
  });
});
