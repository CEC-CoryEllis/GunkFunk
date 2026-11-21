import { describe, expect, it } from "vitest";
import { MovementController } from "../../../src/gameplay/player/movement-controller";
import { DEFAULT_TUNING } from "../../../src/gameplay/player/movement-tuning";
import {
  PlayerPowerUps,
  SOCK_RAPID_FIRE,
  greasedTuning,
} from "../../../src/gameplay/player/player-powerups";
import { POWERUPS } from "../../../src/gameplay/powerups/powerup-definitions";
import { POWERUP_MAP_CHARS } from "../../../src/gameplay/powerups/powerup-ids";
import { PowerUpTimers } from "../../../src/gameplay/powerups/powerup-timers";
import { WeaponInventory } from "../../../src/gameplay/weapons/weapon-inventory";
import { WeaponTrigger } from "../../../src/gameplay/weapons/weapon-trigger";
import { parseLevel } from "../../../src/levels/level-parser";

describe("PowerUpTimers", () => {
  it("runs several at once, refreshes on re-collect and reports expiry", () => {
    const timers = new PowerUpTimers();
    expect(timers.activate("hyperGrease")).toBe(true);
    expect(timers.activate("infiniteSocks")).toBe(true);
    timers.tick(5);
    expect(timers.activate("hyperGrease")).toBe(false);
    expect(timers.remainingOf("hyperGrease")).toBe(POWERUPS.hyperGrease.duration);
    expect(timers.tick(POWERUPS.infiniteSocks.duration - 5)).toEqual(["infiniteSocks"]);
    expect(timers.list().map((p) => p.id)).toEqual(["hyperGrease"]);
  });

  it("ends early and clears", () => {
    const timers = new PowerUpTimers();
    timers.activate("wreckingBall");
    expect(timers.end("wreckingBall")).toBe(true);
    expect(timers.end("wreckingBall")).toBe(false);
    timers.activate("hyperGrease");
    expect(timers.clear()).toEqual(["hyperGrease"]);
    expect(timers.isActive("hyperGrease")).toBe(false);
  });
});

function setup() {
  const inventory = new WeaponInventory([{ id: "chicken", level: 2, ammo: 5 }]);
  const movement = new MovementController({ ...DEFAULT_TUNING });
  return { inventory, movement, powerUps: new PlayerPowerUps(inventory, movement) };
}

describe("PlayerPowerUps", () => {
  it("Infinite Socks equips the sock cannon with free, faster shots, then wears off", () => {
    const { inventory, powerUps } = setup();
    powerUps.activate("infiniteSocks");
    expect(inventory.current?.id).toBe("sock");
    expect(inventory.infiniteAmmo).toBe(true);
    expect(inventory.fireIntervalScale).toBe(SOCK_RAPID_FIRE);
    expect(powerUps.tick(POWERUPS.infiniteSocks.duration + 0.1)).toEqual(["infiniteSocks"]);
    expect(inventory.infiniteAmmo).toBe(false);
    expect(inventory.fireIntervalScale).toBe(1);
  });

  it("Hyper Grease swaps in slippery tuning and restores the original", () => {
    const { movement, powerUps } = setup();
    const base = movement.tuning;
    powerUps.activate("hyperGrease");
    expect(movement.tuning.runSpeed).toBeGreaterThan(base.runSpeed * 1.4);
    expect(movement.tuning.groundDecel).toBeLessThan(base.groundDecel * 0.3);
    powerUps.clear();
    expect(movement.tuning).toBe(base);
  });

  it("greased tuning only changes the slippery bits", () => {
    const greased = greasedTuning(DEFAULT_TUNING);
    expect(greased.jumpSpeed).toBe(DEFAULT_TUNING.jumpSpeed);
    expect(greased.gravity).toBe(DEFAULT_TUNING.gravity);
  });
});

function shotsIn(scale: number): number {
  const inventory = new WeaponInventory([{ id: "sock", level: 1, ammo: 99 }]);
  inventory.fireIntervalScale = scale;
  const trigger = new WeaponTrigger();
  let shots = 0;
  for (let i = 0; i < 120; i++) {
    if (trigger.update(1 / 60, true, i === 0, inventory).fired) shots++;
  }
  return shots;
}

describe("weapon support for power-ups", () => {
  it("equip selects without upgrading", () => {
    const inventory = new WeaponInventory([{ id: "sock", level: 2, ammo: 3 }]);
    inventory.collect("snot");
    inventory.equip("sock");
    expect(inventory.current).toEqual({ id: "sock", level: 2, ammo: 3 });
  });

  it("a fire-interval scale fires proportionally more shots", () => {
    expect(shotsIn(SOCK_RAPID_FIRE)).toBeGreaterThan(shotsIn(1) * 1.8);
  });
});

describe("power-up map markers", () => {
  it("parse to power-up spawns", () => {
    const rows = ["P" + Object.keys(POWERUP_MAP_CHARS).join(""), "####"];
    const parsed = parseLevel({
      id: "t",
      title: "",
      subtitle: "",
      theme: "sewer",
      music: "sewer",
      rows,
    });
    expect(parsed.spawns.filter((s) => s.kind === "powerUp").map((s) => s.powerUp)).toEqual(
      Object.values(POWERUP_MAP_CHARS),
    );
  });
});
