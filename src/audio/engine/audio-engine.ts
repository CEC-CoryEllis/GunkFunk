/**
 * Owns the single realtime `AudioContext` and its mix graph. Nothing touches
 * `window` / `AudioContext` until `unlock()` is called, so this module is safe to
 * import anywhere (tests, SSR, workers). Before unlock every operation only records state.
 */
import type { VolumeSettings } from "../audio-types";
import {
  applyMuffle,
  applyVolumes,
  createMixGraph,
  duckMusic,
  measurePeakDb,
  type MixGraph,
} from "./mix-graph";
import { DEFAULT_VOLUMES, sanitizeVolumes } from "./volume";

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

/** How long `unlock()` waits for `resume()` before giving up (it may need a gesture). */
const RESUME_TIMEOUT_MS = 1000;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private graph: MixGraph | null = null;
  private volumes: VolumeSettings = { ...DEFAULT_VOLUMES };
  private muffled = false;
  private readonly runningListeners: Array<() => void> = [];

  /** The realtime context once it exists (it may still be suspended). */
  get context(): AudioContext | null {
    return this.ctx;
  }

  get mix(): MixGraph | null {
    return this.graph;
  }

  get running(): boolean {
    return this.ctx?.state === "running";
  }

  /** Registers a callback fired every time the context enters the running state. */
  onRunning(listener: () => void): void {
    this.runningListeners.push(listener);
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state !== "running") {
      try {
        await Promise.race([
          ctx.resume(),
          new Promise((resolve) => setTimeout(resolve, RESUME_TIMEOUT_MS)),
        ]);
      } catch (error) {
        console.warn("[audio] could not resume the AudioContext", error);
      }
    }
    if (ctx.state === "running") this.notifyRunning();
  }

  setVolumes(volumes: VolumeSettings): void {
    this.volumes = sanitizeVolumes(volumes, this.volumes);
    if (this.ctx && this.graph) applyVolumes(this.graph, this.volumes, this.ctx.currentTime);
  }

  getVolumes(): VolumeSettings {
    return { ...this.volumes };
  }

  setMuffled(muffled: boolean): void {
    this.muffled = muffled;
    if (this.ctx && this.graph) applyMuffle(this.graph, muffled, this.ctx.currentTime);
  }

  duckMusicUntil(until: number): void {
    if (this.ctx && this.graph) duckMusic(this.graph, this.ctx.currentTime, until);
  }

  /** Output peak level in dBFS (-Infinity when silent or locked). */
  outputPeakDb(): number {
    return this.graph && this.running ? measurePeakDb(this.graph) : -Infinity;
  }

  /** Listeners must be idempotent: this fires on every (re)start of the context. */
  private notifyRunning(): void {
    for (const listener of this.runningListeners) listener();
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = findAudioContext();
    if (!Ctor) return null;
    try {
      const ctx = new Ctor({ latencyHint: "interactive" });
      const graph = createMixGraph(ctx);
      applyVolumes(graph, this.volumes, ctx.currentTime);
      applyMuffle(graph, this.muffled, ctx.currentTime);
      ctx.addEventListener("statechange", () => {
        if (ctx.state === "running") this.notifyRunning();
      });
      this.ctx = ctx;
      this.graph = graph;
      return ctx;
    } catch (error) {
      console.warn("[audio] Web Audio is unavailable", error);
      return null;
    }
  }
}

function findAudioContext(): AudioContextCtor | null {
  const scope = globalThis as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}
