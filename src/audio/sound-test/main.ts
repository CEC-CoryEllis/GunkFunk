/**
 * GUNK FUNK sound test: audition every track, intensity layer, stinger and SFX.
 * Exposes `window.audioLab` (offline renders) and `window.soundTestHooks` (realtime system)
 * for automated verification.
 */
import type { MusicIntensity, MusicTrackId, SfxOptions } from "../audio-types";
import { AudioSystem } from "../audio-system";
import { type AudioLab, createAudioLab } from "./audio-lab";
import { button, buttonRow, el, panel, setActive, slider } from "./dom";

declare global {
  interface Window {
    audioLab?: AudioLab;
    soundTestHooks?: { system: AudioSystem };
  }
}

const system = new AudioSystem();
const lab = createAudioLab();
const sfxOptions: Required<SfxOptions> = { pitch: 1, volume: 1, pan: 0 };

/** Every control is a user gesture, so it doubles as the unlock. */
function withAudio(action: () => void): () => void {
  return () => {
    void system.unlock().then(action);
  };
}

function musicPanel(): HTMLElement {
  const trackButtons = lab.listTracks().map((id) =>
    button(
      id.replace("_", " "),
      `track-${id}`,
      withAudio(() => playTrack(id)),
    ),
  );
  const playTrack = (id: MusicTrackId) => {
    system.music.play(id);
    setActive(trackButtons, trackButtons[lab.listTracks().indexOf(id)]);
  };
  const stop = button("■ stop", "track-stop", () => {
    system.music.stop();
    setActive(trackButtons, null);
  });
  const levels: MusicIntensity[] = [0, 1, 2];
  const intensityButtons = levels.map((level) =>
    button(
      `intensity ${level}`,
      `intensity-${level}`,
      withAudio(() => setIntensity(level)),
    ),
  );
  const setIntensity = (level: MusicIntensity) => {
    system.music.setIntensity(level);
    setActive(intensityButtons, intensityButtons[level]);
  };
  setActive(intensityButtons, intensityButtons[0]);
  let muffled = false;
  const muffle = button("muffle: off", "muffle", () => {
    muffled = !muffled;
    system.music.setMuffled(muffled);
    muffle.textContent = `muffle: ${muffled ? "on" : "off"}`;
    muffle.classList.toggle("active", muffled);
  });
  return panel("Music", [
    buttonRow([...trackButtons, stop]),
    buttonRow([...intensityButtons, muffle]),
  ]);
}

function stingerPanel(): HTMLElement {
  return panel("Stingers", [
    buttonRow(
      lab.listStingers().map((id) =>
        button(
          id.replace("_", " "),
          `stinger-${id}`,
          withAudio(() => system.music.stinger(id)),
        ),
      ),
    ),
  ]);
}

function sfxPanel(): HTMLElement {
  const groups = Object.entries(lab.listSfxGroups()).map(([group, ids]) =>
    el("div", { className: "group" }, [
      el("h3", { text: group }),
      buttonRow(
        ids.map((id) =>
          button(
            id,
            `sfx-${id}`,
            withAudio(() => system.sfx.play(id, { ...sfxOptions })),
          ),
        ),
      ),
    ]),
  );
  const options = el("div", { className: "row sliders" }, [
    slider({
      label: "pitch",
      testId: "sfx-pitch",
      min: 0.5,
      max: 2,
      step: 0.05,
      value: 1,
      onInput: (v) => (sfxOptions.pitch = v),
    }),
    slider({
      label: "volume",
      testId: "sfx-volume",
      min: 0,
      max: 1,
      step: 0.05,
      value: 1,
      onInput: (v) => (sfxOptions.volume = v),
    }),
    slider({
      label: "pan",
      testId: "sfx-pan",
      min: -1,
      max: 1,
      step: 0.1,
      value: 0,
      onInput: (v) => (sfxOptions.pan = v),
    }),
  ]);
  return panel("Sound effects", [options, ...groups]);
}

function volumePanel(): HTMLElement {
  const volumes = system.getVolumes();
  const bus = (key: keyof typeof volumes) =>
    slider({
      label: key,
      testId: `volume-${key}`,
      min: 0,
      max: 1,
      step: 0.01,
      value: volumes[key],
      onInput: (value) => system.setVolumes({ ...system.getVolumes(), [key]: value }),
    });
  return panel("Volume", [
    el("div", { className: "row sliders" }, [bus("master"), bus("music"), bus("sfx")]),
  ]);
}

function statusBar(): HTMLElement {
  const state = el("span", { attrs: { "data-testid": "status" } });
  const track = el("span", { attrs: { "data-testid": "now-playing" } });
  const meterFill = el("div", { className: "meter-fill" });
  const meter = el("div", { className: "meter" }, [meterFill]);
  const update = () => {
    state.textContent = system.unlocked ? "AUDIO: LIVE" : "AUDIO: LOCKED (click anything)";
    track.textContent = `NOW PLAYING: ${system.music.currentTrack ?? "—"}`;
    const db = system.outputPeakDb();
    const fill = Number.isFinite(db) ? Math.max(0, Math.min(1, (db + 48) / 48)) : 0;
    meterFill.style.width = `${(fill * 100).toFixed(1)}%`;
    meterFill.classList.toggle("hot", db > -3);
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
  return el("div", { className: "status" }, [state, track, meter]);
}

function mount(): void {
  const app = document.getElementById("app");
  if (!app) return;
  app.append(
    el("header", {}, [
      el("h1", { text: "GUNK FUNK" }),
      el("p", { className: "subtitle", text: "SOUND TEST — every groove, sting and splat" }),
    ]),
    statusBar(),
    musicPanel(),
    stingerPanel(),
    sfxPanel(),
    volumePanel(),
  );
}

window.audioLab = lab;
window.soundTestHooks = { system };
mount();
