/**
 * Renders N bars of a track (or a whole stinger) into an `OfflineAudioContext`, for
 * tests and WAV export. Like the realtime lookahead scheduler, events are scheduled
 * progressively (via `suspend()`) so only ~1 s of not-yet-played nodes exists at a time —
 * scheduling everything up front makes Chrome process thousands of idle nodes per block.
 */
import type { MusicIntensity, MusicTrackId, StingerId } from "../audio-types";
import { getStinger, getTrack } from "./library";
import { SongPlayback } from "./song-playback";
import { barDuration, STEPS_PER_BAR } from "./timing";

const RENDER_LEAD_IN = 0.05;
/** Seconds between offline scheduling passes, and how far each pass looks ahead. */
const CHUNK = 0.5;
const AHEAD = 0.75;

export interface TrackRenderOptions {
  bars: number;
  intensity: MusicIntensity;
  /** Render only this layer (stem). */
  solo?: string;
}

/** Total seconds an offline context needs for `renderTrackInto`. */
export function trackRenderSeconds(id: MusicTrackId, bars: number): number {
  const song = getTrack(id);
  return RENDER_LEAD_IN + bars * barDuration(song.bpm) + song.tail;
}

export function stingerRenderSeconds(id: StingerId): number {
  const song = getStinger(id);
  return RENDER_LEAD_IN + (song.totalSteps / STEPS_PER_BAR) * barDuration(song.bpm) + song.tail;
}

/** Schedules the track; call `ctx.startRendering()` afterwards. */
export function renderTrackInto(
  ctx: OfflineAudioContext,
  destination: AudioNode,
  id: MusicTrackId,
  options: TrackRenderOptions,
): void {
  const song = getTrack(id);
  const playback = new SongPlayback(ctx, destination, song, {
    startTime: RENDER_LEAD_IN,
    intensity: options.intensity,
    layerFilter: options.solo ? (layer) => layer === options.solo : undefined,
  });
  const end = RENDER_LEAD_IN + options.bars * barDuration(song.bpm) - 1e-6;
  scheduleProgressively(ctx, end, (until) => playback.scheduleUntil(Math.min(until, end), 0));
}

/** Schedules the stinger; call `ctx.startRendering()` afterwards. */
export function renderStingerInto(
  ctx: OfflineAudioContext,
  destination: AudioNode,
  id: StingerId,
): void {
  const playback = new SongPlayback(ctx, destination, getStinger(id), {
    startTime: RENDER_LEAD_IN,
    intensity: 2,
  });
  scheduleProgressively(ctx, playback.endTime, (until) => playback.scheduleUntil(until, 0));
}

function scheduleProgressively(
  ctx: OfflineAudioContext,
  end: number,
  schedule: (until: number) => void,
): void {
  // Firefox has no OfflineAudioContext.suspend(): schedule everything (slower, same result).
  if (typeof ctx.suspend !== "function") {
    schedule(end + AHEAD);
    return;
  }
  schedule(CHUNK + AHEAD);
  for (let at = CHUNK; at + AHEAD < end + CHUNK && at < ctx.length / ctx.sampleRate; at += CHUNK) {
    const until = at + CHUNK + AHEAD;
    void ctx.suspend(at).then(() => {
      schedule(until);
      void ctx.resume();
    });
  }
}
