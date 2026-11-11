import { describe, expect, it } from "vitest";
import type { SfxId } from "../../../src/audio/audio-types";
import { SFX_LEVELS } from "../../../src/audio/sfx/levels";
import { SFX, SFX_IDS, sfxGroupIds } from "../../../src/audio/sfx/registry";
import { createSfx } from "../../../src/audio/sfx/sfx-context";
import { createRng, seedFrom } from "../../../src/audio/synth/random";

describe("SFX registry", () => {
  it("has a recipe and a calibrated level for every id", () => {
    expect(SFX_IDS.length).toBe(58);
    for (const id of SFX_IDS) {
      expect(typeof SFX[id].recipe).toBe("function");
      expect(SFX_LEVELS[id]).toBeGreaterThan(0);
      expect(SFX_LEVELS[id]).toBeLessThan(4);
    }
  });

  it("groups every id exactly once for the sound test", () => {
    const grouped = Object.values(sfxGroupIds()).flat();
    expect(grouped.length).toBe(SFX_IDS.length);
    expect(new Set<SfxId>(grouped)).toEqual(new Set(SFX_IDS));
  });

  it("caps voices per id", () => {
    for (const id of SFX_IDS) {
      const cap = SFX[id].maxVoices ?? 4;
      expect(cap).toBeGreaterThanOrEqual(1);
      expect(cap).toBeLessThanOrEqual(4);
    }
  });
});

describe("per-play variation", () => {
  const fakeCtx = {} as BaseAudioContext;
  const fakeOut = {} as AudioNode;

  it("randomises pitch within the recipe's range around the requested pitch", () => {
    const rand = createRng(7);
    for (let i = 0; i < 200; i++) {
      const s = createSfx(fakeCtx, fakeOut, 0, 1.5, 0.1, rand);
      expect(s.p).toBeGreaterThanOrEqual(1.5 * 0.9);
      expect(s.p).toBeLessThanOrEqual(1.5 * 1.1);
      expect(s.ts).toBeCloseTo(1 / Math.sqrt(s.p), 12);
    }
  });

  it("clamps absurd pitch requests", () => {
    expect(createSfx(fakeCtx, fakeOut, 0, 100, 0, createRng(1)).p).toBe(4);
    expect(createSfx(fakeCtx, fakeOut, 0, 0, 0, createRng(1)).p).toBe(0.25);
  });

  it("is reproducible with a seed and covers its ranges", () => {
    const a = createRng(seedFrom("burp"));
    const b = createRng(seedFrom("burp"));
    const values = Array.from({ length: 1000 }, () => a());
    expect(values).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const s = createSfx(fakeCtx, fakeOut, 0, 1, 0, createRng(3));
    const picks = new Set(Array.from({ length: 100 }, () => s.pick(["a", "b", "c"])));
    expect(picks).toEqual(new Set(["a", "b", "c"]));
    expect(seedFrom("burp")).not.toBe(seedFrom("blabber"));
  });
});
