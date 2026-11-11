/** Wires engine, music and SFX together behind the public `AudioApi`. */
import type { AudioApi, VolumeSettings } from "./audio-types";
import { AudioEngine } from "./engine/audio-engine";
import { MusicPlayer } from "./music/music-player";
import { SfxPlayer } from "./sfx/sfx-player";

export class AudioSystem implements AudioApi {
  private readonly engine = new AudioEngine();
  readonly music = new MusicPlayer(this.engine);
  readonly sfx = new SfxPlayer(this.engine);

  get unlocked(): boolean {
    return this.engine.running;
  }

  unlock(): Promise<void> {
    return this.engine.unlock();
  }

  setVolumes(volumes: VolumeSettings): void {
    this.engine.setVolumes(volumes);
  }

  getVolumes(): VolumeSettings {
    return this.engine.getVolumes();
  }

  /** Output peak in dBFS — for meters in dev tools; -Infinity while locked. */
  outputPeakDb(): number {
    return this.engine.outputPeakDb();
  }
}
