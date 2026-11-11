/**
 * `SfxApi`: plays recipes on the realtime context with a per-id voice cap
 * (the oldest voice is faded out and stolen). Silent no-op until audio is unlocked.
 */
import type { SfxApi, SfxId, SfxOptions } from "../audio-types";
import type { AudioEngine } from "../engine/audio-engine";
import { SFX } from "./registry";
import { type SfxVoice, startSfx } from "./trigger";

const DEFAULT_MAX_VOICES = 4;
const START_DELAY = 0.005;
const STEAL_FADE = 0.012;

export class SfxPlayer implements SfxApi {
  private readonly engine: AudioEngine;
  private readonly voices = new Map<SfxId, SfxVoice[]>();

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  play(id: SfxId, options: SfxOptions = {}): void {
    const ctx = this.engine.context;
    const mix = this.engine.mix;
    const def = SFX[id];
    if (!ctx || !mix || !def || !this.engine.running) return;
    try {
      const now = ctx.currentTime;
      const active = (this.voices.get(id) ?? []).filter((voice) => voice.end > now);
      while (active.length >= (def.maxVoices ?? DEFAULT_MAX_VOICES)) {
        const oldest = active.shift();
        if (oldest) steal(oldest, now);
      }
      const voice = startSfx(ctx, mix.sfxIn, id, options, Math.random, now + START_DELAY);
      active.push(voice);
      this.voices.set(id, active);
      releaseLater(voice, voice.end - now + 0.3);
    } catch (error) {
      console.error(`[audio] sfx "${id}" failed`, error);
    }
  }

  /** Number of voices of `id` still sounding (for tests / debugging). */
  activeVoices(id: SfxId): number {
    const now = this.engine.context?.currentTime ?? 0;
    return (this.voices.get(id) ?? []).filter((voice) => voice.end > now).length;
  }
}

function steal(voice: SfxVoice, now: number): void {
  voice.level.gain.cancelScheduledValues(now);
  voice.level.gain.setTargetAtTime(0, now, STEAL_FADE);
  voice.end = now;
  releaseLater(voice, 0.1);
}

function releaseLater(voice: SfxVoice, seconds: number): void {
  setTimeout(() => voice.output.disconnect(), Math.max(0, seconds) * 1000);
}
