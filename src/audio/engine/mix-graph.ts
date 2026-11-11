/**
 * The mixer, identical for the realtime context and offline renders:
 *
 *   songs ──► musicIn ─► duck ─► muffle (LPF) ─┐
 *   stingers ► stingerIn ──────────────────────┴► musicVolume ─┐
 *   sfx ────► sfxIn ─────────────────────────────► sfxVolume ──┴► master ─► compressor ─► trim ─► limiter ─► out
 *                                                                                                    └► analyser
 */
import type { VolumeSettings } from "../audio-types";
import { chain, filter, gain } from "../synth/nodes";
import { limiterCurve, shaper } from "../synth/shaper";
import { dbToGain, volumeToGain } from "./volume";

/** Internal bus trims so that all-sliders-at-max is a sensible balance. */
const MUSIC_TRIM = 0.7;
/** Recipes are authored with headroom; the per-sound levels live in sfx/levels.ts. */
const SFX_TRIM = 3;
/**
 * Gentle glue compression. Chrome/Firefox add automatic make-up gain of
 * 0.6 × (threshold × (1 − 1/ratio)) dB; OUTPUT_TRIM cancels it so the chain is unity
 * below the threshold.
 */
const COMP_THRESHOLD = -10;
const COMP_RATIO = 2.5;
const OUTPUT_TRIM = dbToGain(0.6 * COMP_THRESHOLD * (1 - 1 / COMP_RATIO));
/** Limiter: transparent below 0.6, never above ≈ -1.2 dBFS. */
const LIMIT_KNEE = 0.6;
const LIMIT_CEILING = 0.87;

const DUCK_DB = -12;
const MUFFLED_HZ = 650;
const OPEN_HZ = 20000;
const MUFFLED_LEVEL = 0.75;
/** Time constant for volume / muffle changes (seconds). */
const SMOOTHING = 0.06;

export interface MixGraph {
  readonly musicIn: GainNode;
  readonly stingerIn: GainNode;
  readonly sfxIn: GainNode;
  readonly duck: GainNode;
  readonly muffle: BiquadFilterNode;
  readonly muffleLevel: GainNode;
  readonly musicVolume: GainNode;
  readonly sfxVolume: GainNode;
  readonly master: GainNode;
  readonly analyser: AnalyserNode;
}

export function createMixGraph(
  ctx: BaseAudioContext,
  destination: AudioNode = ctx.destination,
): MixGraph {
  const musicIn = gain(ctx, 1);
  const stingerIn = gain(ctx, 1);
  const sfxIn = gain(ctx, SFX_TRIM);
  const duck = gain(ctx, 1);
  const muffle = filter(ctx, "lowpass", OPEN_HZ, 0.9);
  const muffleLevel = gain(ctx, 1);
  const musicVolume = gain(ctx, MUSIC_TRIM);
  const sfxVolume = gain(ctx, 1);
  const master = gain(ctx, 1);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = COMP_THRESHOLD;
  compressor.knee.value = 6;
  compressor.ratio.value = COMP_RATIO;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.25;

  const limiter = shaper(ctx, limiterCurve(LIMIT_KNEE, LIMIT_CEILING), "none");
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;

  chain(musicIn, duck, muffle, muffleLevel, musicVolume);
  stingerIn.connect(musicVolume);
  chain(sfxIn, sfxVolume);
  musicVolume.connect(master);
  sfxVolume.connect(master);
  chain(master, compressor, gain(ctx, OUTPUT_TRIM), limiter, destination);
  limiter.connect(analyser);
  return {
    musicIn,
    stingerIn,
    sfxIn,
    duck,
    muffle,
    muffleLevel,
    musicVolume,
    sfxVolume,
    master,
    analyser,
  };
}

export function applyVolumes(graph: MixGraph, volumes: VolumeSettings, now: number): void {
  graph.master.gain.setTargetAtTime(volumeToGain(volumes.master), now, SMOOTHING);
  graph.musicVolume.gain.setTargetAtTime(MUSIC_TRIM * volumeToGain(volumes.music), now, SMOOTHING);
  graph.sfxVolume.gain.setTargetAtTime(volumeToGain(volumes.sfx), now, SMOOTHING);
}

/** Sets volumes instantly (for offline renders, where there is no "before"). */
export function setVolumesNow(graph: MixGraph, volumes: VolumeSettings): void {
  graph.master.gain.value = volumeToGain(volumes.master);
  graph.musicVolume.gain.value = MUSIC_TRIM * volumeToGain(volumes.music);
  graph.sfxVolume.gain.value = volumeToGain(volumes.sfx);
}

export function applyMuffle(graph: MixGraph, muffled: boolean, now: number): void {
  graph.muffle.frequency.setTargetAtTime(muffled ? MUFFLED_HZ : OPEN_HZ, now, SMOOTHING * 1.5);
  graph.muffleLevel.gain.setTargetAtTime(muffled ? MUFFLED_LEVEL : 1, now, SMOOTHING * 1.5);
}

/**
 * Ducks the song bus by `DUCK_DB` from `now` until `until`, then restores it.
 * Overlapping calls simply move the restore point.
 */
export function duckMusic(graph: MixGraph, now: number, until: number): void {
  const param = graph.duck.gain;
  const ducked = dbToGain(DUCK_DB);
  param.cancelScheduledValues(now);
  param.setTargetAtTime(ducked, now, 0.02);
  param.setTargetAtTime(1, Math.max(until, now + 0.1), 0.15);
}

/** Current output peak level in dBFS (for meters). */
export function measurePeakDb(graph: MixGraph): number {
  const data = new Float32Array(graph.analyser.fftSize);
  graph.analyser.getFloatTimeDomainData(data);
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample));
  return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
}
