import { describe, expect, it } from "vitest";
import {
  clampVolume,
  dbToGain,
  DEFAULT_VOLUMES,
  gainToDb,
  sanitizeVolumes,
  volumeToGain,
} from "../../../src/audio/engine/volume";
import { isLayered, layerGain, layerLevel } from "../../../src/audio/music/intensity";
import type { LayerDef } from "../../../src/audio/music/song-types";

describe("layer intensity mapping", () => {
  const drums: LayerDef = { name: "drums", gain: 0.9 };
  const lead: LayerDef = { name: "lead", from: 1, gain: 0.5 };
  const guitar: LayerDef = { name: "guitar", from: 2 };
  const custom: LayerDef = { name: "pad", levels: [0.2, 0.6, 1], gain: 0.5 };

  it("gates layers by their entry intensity", () => {
    expect([0, 1, 2].map((i) => layerLevel(drums, i as 0 | 1 | 2))).toEqual([1, 1, 1]);
    expect([0, 1, 2].map((i) => layerLevel(lead, i as 0 | 1 | 2))).toEqual([0, 1, 1]);
    expect([0, 1, 2].map((i) => layerLevel(guitar, i as 0 | 1 | 2))).toEqual([0, 0, 1]);
  });

  it("supports explicit per-intensity levels and applies the fader", () => {
    expect(layerGain(custom, 0)).toBeCloseTo(0.1, 12);
    expect(layerGain(custom, 2)).toBeCloseTo(0.5, 12);
    expect(layerGain(lead, 2)).toBe(0.5);
    expect(layerGain(lead, 0)).toBe(0);
  });

  it("detects whether a song reacts to intensity", () => {
    expect(isLayered([drums])).toBe(false);
    expect(isLayered([drums, lead])).toBe(true);
    expect(isLayered([custom])).toBe(true);
  });
});

describe("volume settings", () => {
  it("clamps and repairs invalid values", () => {
    expect(clampVolume(1.5, 0.3)).toBe(1);
    expect(clampVolume(-2, 0.3)).toBe(0);
    expect(clampVolume(Number.NaN, 0.3)).toBe(0.3);
    expect(sanitizeVolumes({ master: 2, music: Number.NaN, sfx: 0.25 }, DEFAULT_VOLUMES)).toEqual({
      master: 1,
      music: DEFAULT_VOLUMES.music,
      sfx: 0.25,
    });
    expect(sanitizeVolumes(null)).toEqual(DEFAULT_VOLUMES);
  });

  it("maps sliders to gain on a perceptual (squared) curve", () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(1)).toBe(1);
    expect(volumeToGain(0.5)).toBeCloseTo(0.25, 12);
    expect(gainToDb(volumeToGain(0.5))).toBeCloseTo(-12.04, 2);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(gainToDb(0)).toBe(-Infinity);
  });
});
