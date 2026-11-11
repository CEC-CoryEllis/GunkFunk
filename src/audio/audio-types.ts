/**
 * Public contract of the audio system.
 *
 * Gameplay code talks to audio ONLY through the `audio` singleton exported from
 * `src/audio/index.ts`, which implements `AudioApi`. Everything behind it
 * (instruments, sequencer, SFX recipes) is private to `src/audio/`.
 */

/** Full songs that loop. */
export type MusicTrackId =
  | "title" // Title screen theme: brassy fanfare into a big funk groove
  | "select" // Character / world select: short, bouncy loop
  | "sewer" // World 1 stage theme (has intensity layers)
  | "secret_lounge" // Elevator-muzak rearrangement of the sewer hook for secret rooms
  | "miniboss" // Mini-boss loop
  | "boss"; // Main boss theme (aggressive; has intensity layers)

/** Short one-shot musical cues. Stingers duck the current song while they play. */
export type StingerId =
  | "transform" // Character transformation
  | "powerup" // Normal power-up collected
  | "rare_powerup" // Rare / secret power-up collected
  | "secret_found" // Hidden area discovered
  | "weapon_get" // New weapon or upgrade
  | "extra_life"
  | "boss_intro" // Dramatic boss entrance hit
  | "level_clear" // Stage complete fanfare (~4 s)
  | "game_over" // Sad trombone-ish (~3 s)
  | "death"; // Player loses a life (~1.5 s)

/** Procedural sound effects. Every id must have a distinct, recognisable recipe. */
export type SfxId =
  // UI
  | "menu_move"
  | "menu_select"
  | "menu_back"
  | "pause"
  // Player movement
  | "jump"
  | "double_jump"
  | "wall_jump"
  | "land"
  | "footstep"
  | "slide"
  // Player combat & voice
  | "punch_whoosh"
  | "punch_hit"
  | "punch_heavy"
  | "charge_ready"
  | "hurt"
  | "player_death"
  | "respawn"
  | "blabber" // Gibberish "voice" syllables for speech bubbles (use pitch to vary speakers)
  | "burp"
  // Weapons
  | "sock_fire"
  | "sock_hit"
  | "snot_fire"
  | "snot_bounce"
  | "snot_splat"
  | "chicken_fire" // Rubber-chicken squeak
  | "chicken_explode" // Pop + feather poof + squawk
  | "weapon_switch"
  | "ammo_empty"
  // Enemies
  | "enemy_hit"
  | "enemy_squish"
  | "enemy_pop" // Enemy defeated
  | "rat_squeak"
  | "toilet_chomp"
  | "blob_split"
  | "turnip_throw"
  | "roach_buzz"
  | "enemy_alert"
  // Environment
  | "barrel_explode"
  | "crate_break"
  | "wall_crumble"
  | "toilet_launch" // Flush + spring boing
  | "vending_clunk"
  | "vending_crash"
  | "hydrant_spray"
  | "fan_whoosh"
  | "sludge_splash"
  | "coin" // Small collectible
  | "gem" // Rare collectible
  | "health_pickup" // Gulp
  | "checkpoint"
  // Transformations
  | "transform_inflate"
  | "ball_bounce"
  | "ball_smash"
  // Bosses
  | "boss_roar" // Distorted monster voice
  | "boss_hit"
  | "boss_explode"
  | "mech_stomp"
  | "plunger_fire";

/** 0 = base groove, 1 = adds lead/hook, 2 = full band (adds guitar/extra percussion). */
export type MusicIntensity = 0 | 1 | 2;

export interface SfxOptions {
  /** Playback-rate style pitch multiplier, 1 = default. Recipes add their own small random variation. */
  pitch?: number;
  /** 0..1 multiplier on the recipe's default level. */
  volume?: number;
  /** -1 (left) .. 1 (right). */
  pan?: number;
}

export interface VolumeSettings {
  master: number; // 0..1
  music: number; // 0..1
  sfx: number; // 0..1
}

export interface MusicApi {
  /** Starts a track (cross-fading from the current one). No-op if the same track is already playing. */
  play(track: MusicTrackId, options?: { fadeInSeconds?: number }): void;
  stop(fadeOutSeconds?: number): void;
  /** Smoothly fades layers in/out. Tracks without layers ignore this. */
  setIntensity(level: MusicIntensity): void;
  /** Plays a one-shot cue, ducking the song underneath it. */
  stinger(id: StingerId): void;
  /** Muffles the music (low-pass) e.g. while paused or underwater. */
  setMuffled(muffled: boolean): void;
  readonly currentTrack: MusicTrackId | null;
}

export interface SfxApi {
  play(id: SfxId, options?: SfxOptions): void;
}

export interface AudioApi {
  /** Must be called from a user gesture (key press / click) before anything is audible. Safe to call repeatedly. */
  unlock(): Promise<void>;
  readonly unlocked: boolean;
  readonly music: MusicApi;
  readonly sfx: SfxApi;
  setVolumes(volumes: VolumeSettings): void;
  getVolumes(): VolumeSettings;
}
