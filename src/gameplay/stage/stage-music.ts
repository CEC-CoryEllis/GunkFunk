/**
 * Every music decision for one stage: the stage track, the full band joining
 * in during fights (via MusicDirector), the elevator-muzak lounge version
 * while the player hangs out in a secret area, and boss fight music.
 */
import { audio } from "../../audio";
import type { MusicTrackId } from "../../audio/audio-types";
import { MusicDirector } from "./music-director";

const SECRET_FADE_SECONDS = 0.6;

export class StageMusic {
  private director = new MusicDirector(1);
  private inSecret = false;
  /** A transformation is running: the full band plays regardless of fights. */
  private boosted = false;
  private bossFight = false;

  constructor(private readonly track: MusicTrackId) {}

  start(): void {
    audio.music.play(this.track, { fadeInSeconds: 0.5 });
    // Intensity 1 brings in the lead hook; fights and set pieces push it to 2.
    audio.music.setIntensity(1);
  }

  /** Call regularly with how many enemies are close to the player. */
  update(dt: number, nearbyEnemies: number): void {
    if (this.inSecret || this.boosted || this.bossFight) return;
    const intensity = this.director.update(dt, nearbyEnemies);
    if (intensity !== null) audio.music.setIntensity(intensity);
  }

  /** Full band on while Bulgo is transformed; back to the fight mix after. */
  setBoost(on: boolean): void {
    if (on === this.boosted) return;
    this.boosted = on;
    if (this.inSecret) return;
    this.director = new MusicDirector(1);
    audio.music.setIntensity(on ? 2 : 1);
  }

  /** Boss music while a fight is on; the stage track afterwards. */
  setBossFight(on: boolean, track: MusicTrackId = "miniboss"): void {
    if (on === this.bossFight) return;
    this.bossFight = on;
    this.director = new MusicDirector(1);
    if (on) audio.music.stinger("boss_intro");
    audio.music.play(on ? track : this.track, { fadeInSeconds: on ? 0.3 : 1 });
    audio.music.setIntensity(on || this.boosted ? 2 : 1);
  }

  /** The stage is over: let the fanfare play on its own. */
  finish(): void {
    this.bossFight = false;
    audio.music.stop(0.4);
    audio.music.stinger("level_clear");
  }

  enterSecret(firstVisit: boolean): void {
    this.inSecret = true;
    audio.music.play("secret_lounge", { fadeInSeconds: SECRET_FADE_SECONDS });
    if (firstVisit) audio.music.stinger("secret_found");
  }

  leaveSecret(): void {
    if (!this.inSecret) return;
    this.inSecret = false;
    this.director = new MusicDirector(1);
    audio.music.play(this.track, { fadeInSeconds: SECRET_FADE_SECONDS });
    audio.music.setIntensity(this.boosted ? 2 : 1);
  }
}
