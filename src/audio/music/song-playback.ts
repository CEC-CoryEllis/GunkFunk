/**
 * One playing instance of a compiled song (or stinger) on a given context:
 * layer channels (gain, pan, reverb send) → fade gain → destination.
 * Implements `SchedulerJob`; the same code drives realtime playback and offline renders.
 */
import type { MusicIntensity } from "../audio-types";
import { INSTRUMENTS, createDrumKit } from "../instruments/registry";
import type { DrumKit, NoteSpec, PitchedInstrument } from "../instruments/types";
import { chain, gain, panner } from "../synth/nodes";
import { reverbImpulse } from "../synth/reverb";
import { layerGain } from "./intensity";
import type { SchedulerJob } from "./scheduler";
import type { CompiledSong, LayerDef, NoteEvent } from "./song-types";
import { StepCursor } from "./step-cursor";
import { stepDuration } from "./timing";

export interface PlaybackOptions {
  startTime: number;
  intensity: MusicIntensity;
  /** Seconds to fade in from silence (0 = start at full level). */
  fadeIn?: number;
  /** Only schedule layers for which this returns true (stem renders). */
  layerFilter?: (layer: string) => boolean;
}

/** Events earlier than `now - LATE_TOLERANCE` are skipped instead of played late. */
const LATE_TOLERANCE = 0.02;
const STACCATO_GATE = 0.45;
const NORMAL_GATE = 0.9;

interface Channel {
  def: LayerDef;
  gain: GainNode;
  /** Layers at zero target stop being scheduled once their fade-out is over. */
  silentAfter: number;
  target: number;
}

export class SongPlayback implements SchedulerJob {
  readonly song: CompiledSong;
  private readonly ctx: BaseAudioContext;
  private readonly output: GainNode;
  private readonly cursor: StepCursor;
  private readonly channels = new Map<string, Channel>();
  private readonly instruments = new Map<string, PitchedInstrument>();
  private readonly kits = new Map<string, DrumKit>();
  private readonly layerFilter: (layer: string) => boolean;
  private stopTime: number | null = null;
  private disposed = false;

  constructor(
    ctx: BaseAudioContext,
    destination: AudioNode,
    song: CompiledSong,
    options: PlaybackOptions,
  ) {
    this.ctx = ctx;
    this.song = song;
    this.cursor = new StepCursor(song, options.startTime);
    this.layerFilter = options.layerFilter ?? (() => true);
    this.output = gain(ctx, 1);
    const fadeIn = options.fadeIn ?? 0;
    if (fadeIn > 0) {
      this.output.gain.setValueAtTime(0, options.startTime);
      this.output.gain.linearRampToValueAtTime(1, options.startTime + fadeIn);
    }
    this.output.connect(destination);
    this.buildChannels(options.intensity);
  }

  /** Seconds per 16th step. */
  get stepSeconds(): number {
    return stepDuration(this.song.bpm);
  }

  /** For non-looping songs: when the last step has finished sounding (without tail). */
  get endTime(): number {
    return this.cursor.timeOf(this.song.totalSteps);
  }

  scheduleUntil(until: number, now: number): boolean {
    if (this.disposed) return false;
    if (this.stopTime !== null && now >= this.stopTime + 0.25) {
      this.dispose();
      return false;
    }
    const limit = Math.min(until, this.stopTime ?? Infinity);
    const state = this.cursor.advance(limit, now - LATE_TOLERANCE, (step, time) =>
      this.scheduleStep(step, time, now),
    );
    if (state === "ended" && now > this.endTime + this.song.tail) {
      this.dispose();
      return false;
    }
    return true;
  }

  setIntensity(level: MusicIntensity, now: number, rampSeconds: number): void {
    for (const channel of this.channels.values()) {
      const target = layerGain(channel.def, level);
      if (target === channel.target) continue;
      channel.target = target;
      const param = channel.gain.gain;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(target, now, rampSeconds / 3);
      channel.silentAfter = target > 0 ? Infinity : now + rampSeconds * 1.5;
    }
  }

  /** Fades out and stops scheduling; the job disposes itself after the fade. */
  fadeOut(now: number, seconds: number): void {
    if (this.disposed) return;
    const fade = Math.max(seconds, 0.02);
    const param = this.output.gain;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(0, now, fade / 6);
    this.stopTime = Math.min(this.stopTime ?? Infinity, now + fade);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.output.disconnect();
    for (const instrument of this.instruments.values()) instrument.dispose?.();
  }

  private buildChannels(intensity: MusicIntensity): void {
    const needsReverb = this.song.layers.some((layer) => (layer.reverb ?? 0) > 0);
    let reverbIn: GainNode | null = null;
    if (needsReverb) {
      const convolver = this.ctx.createConvolver();
      convolver.buffer = reverbImpulse(this.ctx);
      reverbIn = gain(this.ctx, 1);
      chain(reverbIn, convolver, this.output);
    }
    for (const def of this.song.layers) {
      const target = layerGain(def, intensity);
      const channelGain = gain(this.ctx, target);
      const pan = def.pan ? panner(this.ctx, def.pan) : null;
      if (pan) chain(channelGain, pan, this.output);
      else channelGain.connect(this.output);
      if (reverbIn && def.reverb) chain(channelGain, gain(this.ctx, def.reverb), reverbIn);
      this.channels.set(def.name, {
        def,
        gain: channelGain,
        target,
        silentAfter: target > 0 ? Infinity : -Infinity,
      });
    }
  }

  private scheduleStep(step: number, time: number, now: number): void {
    for (const event of this.song.events[step]) {
      const channel = this.channels.get(event.layer);
      if (!channel || !this.layerFilter(event.layer)) continue;
      if (channel.target === 0 && now > channel.silentAfter) continue;
      if (event.kind === "drum") {
        this.kitFor(channel).hit(time, event.voice, event.velocity, event.alt);
      } else {
        this.instrumentFor(channel, event).play(time, this.noteSpec(event));
      }
    }
  }

  private noteSpec(event: NoteEvent): NoteSpec {
    const gate = event.legato ? 1 : event.art.staccato ? STACCATO_GATE : NORMAL_GATE;
    return {
      midis: event.midis,
      duration: (event.steps - 1 + gate) * this.stepSeconds,
      velocity: event.velocity,
      art: event.art,
      glideFrom: event.glideFrom,
    };
  }

  private kitFor(channel: Channel): DrumKit {
    let kit = this.kits.get(channel.def.name);
    if (!kit) {
      kit = createDrumKit(this.ctx, channel.gain);
      this.kits.set(channel.def.name, kit);
    }
    return kit;
  }

  private instrumentFor(channel: Channel, event: NoteEvent): PitchedInstrument {
    const key = `${channel.def.name}:${event.instrument}`;
    let instrument = this.instruments.get(key);
    if (!instrument) {
      instrument = INSTRUMENTS[event.instrument](this.ctx, channel.gain);
      this.instruments.set(key, instrument);
    }
    return instrument;
  }
}
