/**
 * `MusicApi` on top of the engine: track cross-fades, intensity layer fades,
 * stingers that duck the song, and the muffle filter.
 *
 * Before the engine is unlocked, calls only record the requested state (track,
 * intensity, muffle); the requested track starts as soon as audio is unlocked.
 */
import type { MusicApi, MusicIntensity, MusicTrackId, StingerId } from "../audio-types";
import type { AudioEngine } from "../engine/audio-engine";
import { getStinger, getTrack } from "./library";
import { LookaheadScheduler } from "./scheduler";
import { SongPlayback } from "./song-playback";

const START_DELAY = 0.06;
const DEFAULT_CROSSFADE = 1;
const INTENSITY_RAMP = 1;
const STINGER_CUT_FADE = 0.05;
/** Lookahead while the tab is hidden and timers are throttled to ~1 Hz. */
const HIDDEN_LOOKAHEAD = 1.5;
const VISIBLE_LOOKAHEAD = 0.1;

export class MusicPlayer implements MusicApi {
  private readonly engine: AudioEngine;
  private scheduler: LookaheadScheduler | null = null;
  private requested: MusicTrackId | null = null;
  private current: { id: MusicTrackId; playback: SongPlayback } | null = null;
  private stingerPlayback: SongPlayback | null = null;
  private intensity: MusicIntensity = 0;

  constructor(engine: AudioEngine) {
    this.engine = engine;
    engine.onRunning(() => this.resumeRequested());
  }

  /** The requested track (also while still waiting for unlock); null when stopped. */
  get currentTrack(): MusicTrackId | null {
    return this.requested;
  }

  play(track: MusicTrackId, options?: { fadeInSeconds?: number }): void {
    if (this.requested === track && (this.current?.id === track || !this.engine.running)) return;
    this.requested = track;
    this.start(track, options?.fadeInSeconds);
  }

  stop(fadeOutSeconds = 1): void {
    this.requested = null;
    const ctx = this.engine.context;
    if (this.current && ctx) this.current.playback.fadeOut(ctx.currentTime, fadeOutSeconds);
    this.current = null;
  }

  setIntensity(level: MusicIntensity): void {
    if (level !== 0 && level !== 1 && level !== 2) return;
    this.intensity = level;
    const ctx = this.engine.context;
    if (this.current && ctx) {
      this.current.playback.setIntensity(level, ctx.currentTime, INTENSITY_RAMP);
    }
  }

  stinger(id: StingerId): void {
    const ctx = this.engine.context;
    const mix = this.engine.mix;
    const scheduler = this.ensureScheduler();
    if (!ctx || !mix || !scheduler || !this.engine.running) return;
    try {
      const now = ctx.currentTime;
      const song = getStinger(id);
      this.stingerPlayback?.fadeOut(now, STINGER_CUT_FADE);
      const playback = new SongPlayback(ctx, mix.stingerIn, song, {
        startTime: now + START_DELAY,
        intensity: 2,
      });
      this.stingerPlayback = playback;
      scheduler.add(playback);
      this.engine.duckMusicUntil(playback.endTime + 0.1);
    } catch (error) {
      console.error(`[audio] stinger "${id}" failed`, error);
    }
  }

  setMuffled(muffled: boolean): void {
    this.engine.setMuffled(muffled);
  }

  private start(track: MusicTrackId, fadeInSeconds: number | undefined): void {
    const ctx = this.engine.context;
    const mix = this.engine.mix;
    const scheduler = this.ensureScheduler();
    if (!ctx || !mix || !scheduler || !this.engine.running) return;
    try {
      const now = ctx.currentTime;
      const song = getTrack(track);
      const previous = this.current;
      const fade = fadeInSeconds ?? (previous ? DEFAULT_CROSSFADE : 0);
      previous?.playback.fadeOut(now, Math.max(fade, 0.05));
      const playback = new SongPlayback(ctx, mix.musicIn, song, {
        startTime: now + START_DELAY,
        intensity: this.intensity,
        fadeIn: fade,
      });
      this.current = { id: track, playback };
      scheduler.add(playback);
    } catch (error) {
      console.error(`[audio] music "${track}" failed`, error);
    }
  }

  private resumeRequested(): void {
    if (this.requested && this.current?.id !== this.requested) this.start(this.requested, 0.3);
  }

  private ensureScheduler(): LookaheadScheduler | null {
    if (this.scheduler) return this.scheduler;
    const ctx = this.engine.context;
    if (!ctx) return null;
    this.scheduler = new LookaheadScheduler(
      { now: () => ctx.currentTime },
      {
        set: (callback, ms) => setTimeout(callback, ms),
        clear: (handle) => clearTimeout(handle as number),
      },
      {
        lookahead: () =>
          typeof document !== "undefined" && document.hidden ? HIDDEN_LOOKAHEAD : VISIBLE_LOOKAHEAD,
      },
    );
    return this.scheduler;
  }
}
