/** Compiled, cached access to every track and stinger. */
import type { MusicTrackId, StingerId } from "../audio-types";
import { compileSong } from "./compile";
import type { CompiledSong } from "./song-types";
import { barDuration, STEPS_PER_BAR } from "./timing";
import { STINGERS } from "./tracks/stingers";
import { TRACKS } from "./tracks";

const compiledTracks = new Map<MusicTrackId, CompiledSong>();
const compiledStingers = new Map<StingerId, CompiledSong>();

export const TRACK_IDS = Object.keys(TRACKS) as MusicTrackId[];
export const STINGER_IDS = Object.keys(STINGERS) as StingerId[];

export function getTrack(id: MusicTrackId): CompiledSong {
  let song = compiledTracks.get(id);
  if (!song) {
    song = compileSong(TRACKS[id], id);
    compiledTracks.set(id, song);
  }
  return song;
}

export function getStinger(id: StingerId): CompiledSong {
  let song = compiledStingers.get(id);
  if (!song) {
    song = compileSong(STINGERS[id], `stinger:${id}`);
    compiledStingers.set(id, song);
  }
  return song;
}

/** Number of bars in one pass through the arrangement (intro + loop body). */
export function trackBars(id: MusicTrackId): number {
  return getTrack(id).totalSteps / STEPS_PER_BAR;
}

/** Seconds a stinger's notes last (without the release tail). */
export function stingerSeconds(id: StingerId): number {
  const song = getStinger(id);
  return (song.totalSteps * barDuration(song.bpm)) / STEPS_PER_BAR;
}

export function trackLayers(id: MusicTrackId): string[] {
  return getTrack(id).layers.map((layer) => layer.name);
}
