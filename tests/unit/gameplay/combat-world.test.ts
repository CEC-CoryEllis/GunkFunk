import { describe, expect, it } from "vitest";
import { CombatWorld } from "../../../src/gameplay/combat/combat-world";
import {
  type Damageable,
  type HitInfo,
  type HitResult,
  type Rect,
  type Team,
  knockbackFor,
} from "../../../src/gameplay/combat/hit-types";

class Target implements Damageable {
  hits: HitInfo[] = [];
  targetable = true;
  constructor(
    readonly team: Team,
    private readonly box: Rect,
  ) {}
  hurtbox(): Rect {
    return this.box;
  }
  takeHit(hit: HitInfo): HitResult {
    this.hits.push(hit);
    return { applied: true, defeated: false };
  }
}

function makeHit(overrides: Partial<HitInfo> = {}): HitInfo {
  return {
    key: "swing-1",
    team: "player",
    kind: "melee",
    damage: 1,
    knockbackX: 100,
    knockbackY: -50,
    x: 0,
    y: 0,
    impact: 0.5,
    ...overrides,
  };
}

const AREA: Rect = { x: 0, y: 0, width: 20, height: 20 };

describe("CombatWorld", () => {
  it("hits overlapping targets of other teams only", () => {
    const world = new CombatWorld();
    const enemy = new Target("enemy", { x: 5, y: 5, width: 10, height: 10 });
    const friend = new Target("player", { x: 5, y: 5, width: 10, height: 10 });
    const faraway = new Target("enemy", { x: 100, y: 100, width: 10, height: 10 });
    for (const t of [enemy, friend, faraway]) world.register(t);
    const outcomes = world.strike(AREA, makeHit());
    expect(outcomes.map((o) => o.target)).toEqual([enemy]);
    expect(friend.hits).toHaveLength(0);
    expect(faraway.hits).toHaveLength(0);
  });

  it("hits a target only once per key, across many active frames", () => {
    const world = new CombatWorld();
    const enemy = new Target("enemy", { x: 0, y: 0, width: 10, height: 10 });
    world.register(enemy);
    for (let frame = 0; frame < 6; frame++) world.strike(AREA, makeHit());
    expect(enemy.hits).toHaveLength(1);
    world.strike(AREA, makeHit({ key: "swing-2" }));
    expect(enemy.hits).toHaveLength(2);
  });

  it("forgets old keys after a while", () => {
    const world = new CombatWorld();
    const enemy = new Target("enemy", { x: 0, y: 0, width: 10, height: 10 });
    world.register(enemy);
    world.strike(AREA, makeHit());
    world.tick(3);
    world.strike(AREA, makeHit());
    expect(enemy.hits).toHaveLength(2);
  });

  it("skips untargetable and unregistered targets", () => {
    const world = new CombatWorld();
    const ghost = new Target("enemy", { x: 0, y: 0, width: 10, height: 10 });
    ghost.targetable = false;
    const gone = new Target("enemy", { x: 0, y: 0, width: 10, height: 10 });
    world.register(ghost);
    world.register(gone);
    world.unregister(gone);
    expect(world.strike(AREA, makeHit())).toHaveLength(0);
  });

  it("finds the nearest enemy for homing and respects range", () => {
    const world = new CombatWorld();
    const near = new Target("enemy", { x: 40, y: 0, width: 10, height: 10 });
    const far = new Target("enemy", { x: 140, y: 0, width: 10, height: 10 });
    world.register(far);
    world.register(near);
    expect(world.nearest(0, 5, "player", 500)).toBe(near);
    expect(world.nearest(0, 5, "player", 20)).toBeNull();
    expect(world.overlapsAny({ x: 35, y: 0, width: 10, height: 10 }, "player")).toBe(true);
  });

  it("sends radial knockback away from an explosion", () => {
    const blast = makeHit({ x: 50, knockbackX: 200, radial: true });
    expect(knockbackFor(blast, 80)).toBe(200);
    expect(knockbackFor(blast, 20)).toBe(-200);
    expect(knockbackFor(makeHit({ knockbackX: -90 }), 999)).toBe(-90);
  });
});

describe("CombatWorld re-entrancy", () => {
  it("does not strike targets registered while the strike is being resolved", () => {
    const world = new CombatWorld();
    const spawned = new Target("enemy", { x: 0, y: 0, width: 10, height: 10 });
    const splitter = new Target("enemy", { x: 0, y: 0, width: 10, height: 10 });
    splitter.takeHit = (hit) => {
      splitter.hits.push(hit);
      world.register(spawned); // e.g. a blob splitting into a new blob
      return { applied: true, defeated: false };
    };
    world.register(splitter);
    world.strike(AREA, makeHit());
    expect(splitter.hits).toHaveLength(1);
    expect(spawned.hits).toHaveLength(0);
  });
});
