/**
 * Offline render API used by the sound test page and the Playwright verification
 * script (`window.audioLab`). Everything renders through the real mix graph
 * (compressor + limiter) at 44.1 kHz stereo with all volume sliders at maximum.
 */
import type { MusicIntensity, MusicTrackId, SfxId, SfxOptions, StingerId } from "../audio-types";
import {
  applyMuffle,
  createMixGraph,
  duckMusic,
  type MixGraph,
  setVolumesNow,
} from "../engine/mix-graph";
import { STINGER_IDS, stingerSeconds, TRACK_IDS, trackBars, trackLayers } from "../music/library";
import {
  renderStingerInto,
  renderTrackInto,
  stingerRenderSeconds,
  trackRenderSeconds,
} from "../music/render";
import { SFX_IDS, sfxGroupIds } from "../sfx/registry";
import { startSfx } from "../sfx/trigger";
import { createRng, seedFrom } from "../synth/random";

const LAB_SAMPLE_RATE = 44100;
const MAX_VOLUMES = { master: 1, music: 1, sfx: 1 };
const SFX_RENDER_SECONDS = 5;
const SFX_START = 0.02;
const SFX_TAIL = 0.25;

export interface AudioLab {
  readonly sampleRate: number;
  listSfx(): SfxId[];
  listSfxGroups(): Record<string, SfxId[]>;
  listTracks(): MusicTrackId[];
  listStingers(): StingerId[];
  listLayers(track: MusicTrackId): string[];
  /** Bars in one pass through the track's arrangement. */
  trackBars(track: MusicTrackId): number;
  /** Musical length of a stinger (= how long it ducks the song), without release tail. */
  stingerSeconds(id: StingerId): number;
  renderSfx(id: SfxId, options?: SfxOptions & { seed?: number }): Promise<Float32Array[]>;
  /** Renders `bars` bars (default: the whole arrangement once). `solo` renders one layer. */
  renderTrack(
    id: MusicTrackId,
    bars?: number,
    intensity?: MusicIntensity,
    solo?: string,
  ): Promise<Float32Array[]>;
  renderStinger(id: StingerId): Promise<Float32Array[]>;
  /** Renders a track with the bus effects applied: a stinger-style duck and/or muffle. */
  renderTrackFx(id: MusicTrackId, bars: number, fx: MixFx): Promise<Float32Array[]>;
}

export interface MixFx {
  /** Duck the song bus from `duck[0]` to `duck[1]` seconds, as a stinger would. */
  duck?: [number, number];
  muffled?: boolean;
}

type Build = (ctx: OfflineAudioContext, mix: MixGraph) => number | undefined;

/** Renders into a fresh offline context; `build` may return the useful length in seconds. */
async function renderOffline(seconds: number, build: Build): Promise<Float32Array[]> {
  const length = Math.ceil(seconds * LAB_SAMPLE_RATE);
  const ctx = new OfflineAudioContext(2, length, LAB_SAMPLE_RATE);
  const mix = createMixGraph(ctx);
  setVolumesNow(mix, MAX_VOLUMES);
  const used = build(ctx, mix);
  const buffer = await ctx.startRendering();
  const keep = used === undefined ? length : Math.min(length, Math.ceil(used * LAB_SAMPLE_RATE));
  return [buffer.getChannelData(0).slice(0, keep), buffer.getChannelData(1).slice(0, keep)];
}

export function createAudioLab(): AudioLab {
  return {
    sampleRate: LAB_SAMPLE_RATE,
    listSfx: () => [...SFX_IDS],
    listSfxGroups: sfxGroupIds,
    listTracks: () => [...TRACK_IDS],
    listStingers: () => [...STINGER_IDS],
    listLayers: trackLayers,
    trackBars,
    stingerSeconds,
    renderSfx: (id, options = {}) =>
      renderOffline(SFX_RENDER_SECONDS, (ctx, mix) => {
        const rand = createRng(options.seed ?? seedFrom(id));
        const voice = startSfx(ctx, mix.sfxIn, id, options, rand, SFX_START);
        return voice.end + SFX_TAIL;
      }),
    renderTrack: (id, bars = trackBars(id), intensity = 2, solo) =>
      renderOffline(trackRenderSeconds(id, bars), (ctx, mix) => {
        renderTrackInto(ctx, mix.musicIn, id, { bars, intensity, solo });
        return undefined;
      }),
    renderTrackFx: (id, bars, fx) =>
      renderOffline(trackRenderSeconds(id, bars), (ctx, mix) => {
        if (fx.muffled) applyMuffle(mix, true, 0);
        if (fx.duck) duckMusic(mix, fx.duck[0], fx.duck[1]);
        renderTrackInto(ctx, mix.musicIn, id, { bars, intensity: 2 });
        return undefined;
      }),
    renderStinger: (id) =>
      renderOffline(stingerRenderSeconds(id), (ctx, mix) => {
        renderStingerInto(ctx, mix.stingerIn, id);
        return undefined;
      }),
  };
}
