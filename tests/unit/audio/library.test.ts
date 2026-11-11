import { describe, expect, it } from "vitest";
import type { MusicTrackId, StingerId } from "../../../src/audio/audio-types";
import { isLayered } from "../../../src/audio/music/intensity";
import {
  getStinger,
  getTrack,
  STINGER_IDS,
  stingerSeconds,
  TRACK_IDS,
  trackBars,
} from "../../../src/audio/music/library";

const ALL_TRACKS: MusicTrackId[] = [
  "title",
  "select",
  "sewer",
  "secret_lounge",
  "miniboss",
  "boss",
];
const ALL_STINGERS: StingerId[] = [
  "transform",
  "powerup",
  "rare_powerup",
  "secret_found",
  "weapon_get",
  "extra_life",
  "boss_intro",
  "level_clear",
  "game_over",
  "death",
];

const bpm = (id: MusicTrackId) => getTrack(id).bpm;

describe("track library", () => {
  it("has every track and stinger of the public contract", () => {
    expect(new Set(TRACK_IDS)).toEqual(new Set(ALL_TRACKS));
    expect(TRACK_IDS).toHaveLength(ALL_TRACKS.length);
    expect(new Set(STINGER_IDS)).toEqual(new Set(ALL_STINGERS));
    expect(STINGER_IDS).toHaveLength(ALL_STINGERS.length);
  });

  it.each(ALL_TRACKS)("%s compiles to loopable data with notes on every layer", (id) => {
    const song = getTrack(id);
    expect(song.loop).toBe(true);
    expect(song.totalSteps % 16).toBe(0);
    expect(song.loopStart).toBeLessThan(song.totalSteps);
    const used = new Set(song.events.flat().map((event) => event.layer));
    for (const layer of song.layers) expect(used.has(layer.name)).toBe(true);
  });

  it("matches the tempo brief", () => {
    expect(bpm("sewer")).toBeGreaterThanOrEqual(108);
    expect(bpm("sewer")).toBeLessThanOrEqual(112);
    expect(bpm("title")).toBeCloseTo(118, 0);
    expect(bpm("secret_lounge")).toBeCloseTo(90, 0);
    expect(bpm("miniboss")).toBeCloseTo(128, 0);
    expect(bpm("boss")).toBeCloseTo(140, 0);
    expect(trackBars("select")).toBeLessThanOrEqual(8);
    expect(trackBars("sewer")).toBeGreaterThanOrEqual(28);
  });

  it("gives the sewer and boss intensity layers (and only them)", () => {
    const layered = ALL_TRACKS.filter((id) => isLayered(getTrack(id).layers));
    expect(layered).toEqual(["sewer", "boss"]);
    const sewer = getTrack("sewer").layers;
    expect(sewer.filter((l) => (l.from ?? 0) === 0).map((l) => l.name)).toEqual([
      "drums",
      "bass",
      "clav",
    ]);
  });

  it("drives every song with the slap bass (except the lounge's upright)", () => {
    for (const id of ALL_TRACKS) {
      const instruments = new Set(
        getTrack(id)
          .events.flat()
          .flatMap((e) => (e.kind === "note" ? [e.instrument] : [])),
      );
      expect(instruments.has(id === "secret_lounge" ? "softBass" : "slapBass")).toBe(true);
    }
  });
});

describe("stingers", () => {
  it.each(ALL_STINGERS)("%s is a one-shot of sensible length", (id) => {
    expect(getStinger(id).loop).toBe(false);
    expect(stingerSeconds(id)).toBeGreaterThan(0.9);
    expect(stingerSeconds(id)).toBeLessThan(4.5);
  });

  it("honours the lengths implied by the contract", () => {
    expect(stingerSeconds("level_clear")).toBeCloseTo(4, 1);
    expect(stingerSeconds("game_over")).toBeCloseTo(3, 1);
    expect(stingerSeconds("death")).toBeCloseTo(1.5, 1);
    expect(stingerSeconds("transform")).toBeGreaterThanOrEqual(1);
    expect(stingerSeconds("transform")).toBeLessThanOrEqual(2);
  });
});
