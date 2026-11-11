/** User volume settings: validation and perceptual mapping. Pure. */
import type { VolumeSettings } from "../audio-types";

export const DEFAULT_VOLUMES: Readonly<VolumeSettings> = { master: 0.9, music: 0.8, sfx: 0.9 };

export function clampVolume(value: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function sanitizeVolumes(
  volumes: Partial<VolumeSettings> | null | undefined,
  previous: VolumeSettings = DEFAULT_VOLUMES,
): VolumeSettings {
  return {
    master: clampVolume(volumes?.master ?? previous.master, previous.master),
    music: clampVolume(volumes?.music ?? previous.music, previous.music),
    sfx: clampVolume(volumes?.sfx ?? previous.sfx, previous.sfx),
  };
}

/** Slider position (0..1) → linear gain. Squared so the slider feels even to the ear. */
export function volumeToGain(volume: number): number {
  const v = clampVolume(volume, 0);
  return v * v;
}

export function gainToDb(gain: number): number {
  return gain <= 0 ? -Infinity : 20 * Math.log10(gain);
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}
