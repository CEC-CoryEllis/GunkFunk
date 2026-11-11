/** Music intensity → layer level mapping. Pure. */
import type { MusicIntensity } from "../audio-types";
import type { LayerDef } from "./song-types";

/** Level (0..1, before the channel fader) of a layer at the given intensity. */
export function layerLevel(layer: LayerDef, intensity: MusicIntensity): number {
  if (layer.levels) return layer.levels[intensity];
  return intensity >= (layer.from ?? 0) ? 1 : 0;
}

/** Final channel gain: level × fader. */
export function layerGain(layer: LayerDef, intensity: MusicIntensity): number {
  return layerLevel(layer, intensity) * (layer.gain ?? 1);
}

/** True if any layer reacts to intensity. */
export function isLayered(layers: readonly LayerDef[]): boolean {
  return layers.some((layer) => layerLevel(layer, 0) !== layerLevel(layer, 2));
}
