import { describe, expect, it } from "vitest";
import { AudioSystem } from "../../../src/audio/audio-system";
import { audio } from "../../../src/audio/index";

describe("audio singleton outside the browser / before unlock", () => {
  it("imports without touching Web Audio and starts locked", () => {
    expect(audio.unlocked).toBe(false);
    expect(audio.music.currentTrack).toBeNull();
  });

  it("treats every call before unlock as a silent no-op", () => {
    const system = new AudioSystem();
    expect(() => {
      system.sfx.play("jump", { pitch: 2, volume: 0.5, pan: -1 });
      system.music.stinger("transform");
      system.music.setIntensity(2);
      system.music.setMuffled(true);
      system.music.play("sewer", { fadeInSeconds: 2 });
      system.music.play("sewer");
      system.music.stop(0.5);
    }).not.toThrow();
    expect(system.unlocked).toBe(false);
  });

  it("remembers the requested track so it can start on unlock", () => {
    const system = new AudioSystem();
    system.music.play("title");
    expect(system.music.currentTrack).toBe("title");
    system.music.play("boss");
    expect(system.music.currentTrack).toBe("boss");
    system.music.stop();
    expect(system.music.currentTrack).toBeNull();
  });

  it("unlock() resolves (without audio) when Web Audio is unavailable", async () => {
    const system = new AudioSystem();
    await expect(system.unlock()).resolves.toBeUndefined();
    expect(system.unlocked).toBe(false);
  });

  it("stores sanitised volumes and returns copies", () => {
    const system = new AudioSystem();
    system.setVolumes({ master: 2, music: -1, sfx: 0.4 });
    const volumes = system.getVolumes();
    expect(volumes).toEqual({ master: 1, music: 0, sfx: 0.4 });
    volumes.master = 0;
    expect(system.getVolumes().master).toBe(1);
  });
});
