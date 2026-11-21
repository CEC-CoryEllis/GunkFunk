import { describe, expect, it } from "vitest";
import { ChargeAttack, CHARGE_FULL } from "../../../src/gameplay/player/charge-attack";
import {
  launchVelocity,
  type ProjectileBody,
  stepProjectile,
  steerToward,
} from "../../../src/gameplay/weapons/projectile-motion";
import { shotRequests } from "../../../src/gameplay/weapons/shot-pattern";
import { WEAPONS, weaponLevel } from "../../../src/gameplay/weapons/weapon-definitions";
import { WeaponInventory } from "../../../src/gameplay/weapons/weapon-inventory";
import { WeaponTrigger } from "../../../src/gameplay/weapons/weapon-trigger";

const DT = 1 / 60;

/** Terrain predicates for projectile tests. */
const floorAt = (y: number) => (_x: number, py: number) => py >= y;
const wall = (x: number) => x >= 30;

describe("WeaponInventory", () => {
  it("adds a new weapon at level 1, equips it, and upgrades on repeat pickups", () => {
    const inv = new WeaponInventory([{ id: "sock", level: 1, ammo: 10 }]);
    expect(inv.collect("snot").kind).toBe("new");
    expect(inv.current?.id).toBe("snot");
    expect(inv.collect("sock")).toMatchObject({ kind: "upgraded", weapon: { level: 2 } });
    expect(inv.current?.id).toBe("sock");
    inv.collect("sock");
    expect(inv.collect("sock").kind).toBe("ammo"); // already level 3
    expect(inv.current?.level).toBe(3);
  });

  it("caps ammo at the weapon's maximum", () => {
    const inv = new WeaponInventory([{ id: "chicken", level: 1, ammo: 14 }]);
    for (let i = 0; i < 5; i++) inv.collect("chicken");
    expect(inv.current?.ammo).toBe(WEAPONS.chicken.maxAmmo);
  });

  it("cycles through weapons in both directions", () => {
    const inv = new WeaponInventory([
      { id: "sock", level: 1, ammo: 1 },
      { id: "snot", level: 1, ammo: 1 },
      { id: "chicken", level: 1, ammo: 1 },
    ]);
    expect(inv.cycle(1)?.id).toBe("snot");
    expect(inv.cycle(1)?.id).toBe("chicken");
    expect(inv.cycle(1)?.id).toBe("sock");
    expect(inv.cycle(-1)?.id).toBe("chicken");
  });

  it("refuses to fire when empty unless ammo is infinite", () => {
    const inv = new WeaponInventory([{ id: "sock", level: 1, ammo: 1 }]);
    expect(inv.consume()).toBe(true);
    expect(inv.consume()).toBe(false);
    inv.infiniteAmmo = true;
    expect(inv.consume()).toBe(true);
    expect(inv.current?.ammo).toBe(0);
  });
});

describe("WeaponTrigger", () => {
  it("fires immediately, then auto-repeats at the level's fire interval", () => {
    const inv = new WeaponInventory([{ id: "sock", level: 1, ammo: 99 }]);
    const trigger = new WeaponTrigger();
    let shots = 0;
    for (let frame = 0; frame < 60; frame++) {
      if (trigger.update(DT, true, frame === 0, inv).fired) shots++;
    }
    const interval = weaponLevel("sock", 1).fireInterval;
    expect(shots).toBe(Math.ceil(1 / interval));
  });

  it("clicks empty only on the press, not every frame", () => {
    const inv = new WeaponInventory([{ id: "sock", level: 1, ammo: 0 }]);
    const trigger = new WeaponTrigger();
    expect(trigger.update(DT, true, true, inv).empty).toBe(true);
    expect(trigger.update(DT, true, false, inv).empty).toBe(false);
  });
});

describe("projectile motion", () => {
  const spec = { gravity: 700, bounciness: 0.7, friction: 0.9 };

  it("bounces off the floor, losing energy, then gets blocked when out of bounces", () => {
    const body: ProjectileBody = { x: 0, y: 0, vx: 50, vy: 0, radius: 2, bouncesLeft: 2 };
    const events: string[] = [];
    for (let i = 0; i < 400 && !events.includes("blocked"); i++) {
      events.push(...stepProjectile(body, spec, DT, floorAt(40)));
    }
    expect(events.filter((e) => e === "bounce")).toHaveLength(2);
    expect(events).toContain("blocked");
    expect(body.y).toBeLessThan(40);
  });

  it("stops straight shots at walls", () => {
    const body: ProjectileBody = { x: 0, y: 0, vx: 300, vy: 0, radius: 3, bouncesLeft: 0 };
    let blocked = false;
    for (let i = 0; i < 30 && !blocked; i++) {
      blocked = stepProjectile(body, { gravity: 0, bounciness: 0, friction: 1 }, DT, wall).includes(
        "blocked",
      );
    }
    expect(blocked).toBe(true);
    expect(body.x).toBeLessThan(30);
  });

  it("homing turns towards the target without changing speed", () => {
    const body: ProjectileBody = { x: 0, y: 0, vx: 100, vy: 0, radius: 2, bouncesLeft: 0 };
    for (let i = 0; i < 60; i++) steerToward(body, 0, 100, 5, DT);
    expect(Math.hypot(body.vx, body.vy)).toBeCloseTo(100, 5);
    expect(body.vy).toBeGreaterThan(90);
  });

  it("mirrors launch velocity by facing and aims up for positive angles", () => {
    const right = launchVelocity(30, 100, 1);
    const left = launchVelocity(30, 100, -1);
    expect(right.vx).toBeCloseTo(-left.vx);
    expect(right.vy).toBeLessThan(0);
  });
});

describe("shot patterns", () => {
  it("level-3 sock cannon fires a three-sock spread with the damage bonus", () => {
    const shots = shotRequests(weaponLevel("sock", 3), { x: 10, y: 20 }, -1, "player");
    expect(shots).toHaveLength(3);
    expect(shots.every((s) => s.vx < 0 && s.damageBonus === 1)).toBe(true);
    expect(new Set(shots.map((s) => Math.sign(s.vy))).size).toBe(3);
  });

  it("upper levels unlock behaviours, not just numbers", () => {
    expect(
      shotRequests(weaponLevel("snot", 3), { x: 0, y: 0 }, 1, "player")[0]?.splitOnBounce,
    ).toBe(true);
    expect(
      shotRequests(weaponLevel("chicken", 3), { x: 0, y: 0 }, 1, "player").every((s) => s.homing),
    ).toBe(true);
    expect(shotRequests(weaponLevel("chicken", 1), { x: 0, y: 0 }, 1, "player")[0]?.homing).toBe(
      false,
    );
  });
});

describe("ChargeAttack", () => {
  it("charges while held and releases a punch only when fully charged", () => {
    const charge = new ChargeAttack();
    let becameReady = 0;
    for (let t = 0; t < CHARGE_FULL + 0.1; t += DT) {
      if (charge.update(DT, true, true).becameReady) becameReady++;
    }
    expect(becameReady).toBe(1);
    expect(charge.update(DT, false, true).release).toBe(true);
  });

  it("a short hold does nothing on release", () => {
    const charge = new ChargeAttack();
    for (let i = 0; i < 20; i++) charge.update(DT, true, true);
    expect(charge.update(DT, false, true).release).toBe(false);
  });

  it("does not wind up while another attack is playing", () => {
    const charge = new ChargeAttack();
    let charging = false;
    for (let i = 0; i < 60; i++) charging ||= charge.update(DT, true, false).charging;
    expect(charging).toBe(false);
  });
});
