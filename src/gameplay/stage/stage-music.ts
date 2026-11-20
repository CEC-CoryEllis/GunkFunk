/**
 * Every music decision for one stage: the stage track, the full band joining
 * in during fights (via MusicDirector), and the elevator-muzak lounge version
 * while the player hangs out in a secret area.
 */
import { audio } from "../../audio";
import type { MusicTrackId } from "../../audio/audio-types";
import { MusicDirector } from "./music-director";

const SECRET_FADE_SECONDS = 0.6;

export class StageMusic {
  private director = new MusicDirector(1);
  private inSecret = false;

  constructor(private readonly track: MusicTrackId) {}

  start(): void {
    audio.music.play(this.track, { fadeInSeconds: 0.5 });
    // Intensity 1 brings in the lead hook; fights and set pieces push it to 2.
    audio.music.setIntensity(1);
  }

  /** Call regularly with how many enemies are close to the player. */
  update(dt: number, nearbyEnemies: number): void {
    if (this.inSecret) return;
    const intensity = this.director.update(dt, nearbyEnemies);
    if (intensity !== null) audio.music.setIntensity(intensity);
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
    audio.music.setIntensity(1);
  }
}
