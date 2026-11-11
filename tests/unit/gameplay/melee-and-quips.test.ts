import { describe, expect, it } from "vitest";
import { BULGO } from "../../../src/gameplay/characters/bulgo";
import { MeleeCombo } from "../../../src/gameplay/player/melee-combo";
import { QuipDirector } from "../../../src/gameplay/player/quip-director";

const DT = 1 / 60;

describe("MeleeCombo", () => {
  it("chains jab → uppercut → belly bump when pressed in rhythm", () => {
    const combo = new MeleeCombo(BULGO.combo, BULGO.airAttack);
    const started: string[] = [];
    for (let frame = 0; frame < 90; frame++) {
      const press = frame % 10 === 0;
      const step = combo.update(DT, press, true);
      if (step.started) started.push(step.started.anim);
    }
    expect(started.slice(0, 3)).toEqual(["punch1", "punch2", "punch3"]);
  });

  it("opens the hit window only inside the active frames", () => {
    const combo = new MeleeCombo(BULGO.combo, BULGO.airAttack);
    combo.update(DT, true, true);
    const activity: boolean[] = [];
    for (let i = 0; i < 20; i++) activity.push(combo.update(DT, false, true).active);
    expect(activity[0]).toBe(false);
    expect(activity.some(Boolean)).toBe(true);
    expect(activity.at(-1)).toBe(false);
  });

  it("uses the air attack when airborne and does not chain it", () => {
    const combo = new MeleeCombo(BULGO.combo, BULGO.airAttack);
    const first = combo.update(DT, true, false);
    expect(first.started?.anim).toBe("air_punch");
    let chained = false;
    for (let i = 0; i < 8; i++) chained ||= combo.update(DT, true, false).started !== undefined;
    expect(chained).toBe(false);
  });

  it("resets after the attack finishes", () => {
    const combo = new MeleeCombo(BULGO.combo, BULGO.airAttack);
    combo.update(DT, true, true);
    for (let i = 0; i < 40; i++) combo.update(DT, false, true);
    expect(combo.busy).toBe(false);
    expect(combo.update(DT, true, true).started?.anim).toBe("punch1");
  });
});

describe("QuipDirector", () => {
  it("never repeats the same line twice in a row and respects cooldown", () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 0.5; // always under chance
    const quips = new QuipDirector(BULGO.quips, random);
    const first = quips.trigger("hurt");
    expect(first).not.toBeNull();
    expect(quips.trigger("hurt")).toBeNull(); // cooldown
    const second = quips.trigger("hurt", true);
    expect(second).not.toBe(first);
  });
});
