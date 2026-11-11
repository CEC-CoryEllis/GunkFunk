/**
 * The SFX mixing desk: one output level per sound, calibrated from offline renders so
 * that momentary loudness lands on per-category targets (big impacts ≈ -14 LUFS,
 * hits ≈ -18, small / frequent sounds ≈ -22..-27 at full volume) with standalone peaks
 * kept under ≈ -2.5 dBFS. Re-measure with `node tests/e2e/audio-render.mjs` after
 * changing a recipe.
 */
import type { SfxId } from "../audio-types";

export const SFX_LEVELS: Record<SfxId, number> = {
  // UI
  menu_move: 2.16,
  menu_select: 1.02,
  menu_back: 1.6,
  pause: 1.46,
  // Player movement
  jump: 2.5,
  double_jump: 1.19,
  wall_jump: 1.02,
  land: 1.21,
  footstep: 1.72,
  slide: 0.8,
  // Player combat & voice
  punch_whoosh: 1.79,
  punch_hit: 1.05,
  punch_heavy: 1.04,
  charge_ready: 0.4,
  hurt: 0.45,
  player_death: 0.24,
  respawn: 0.51,
  blabber: 0.68,
  burp: 0.56,
  // Weapons
  sock_fire: 1.99,
  sock_hit: 2.24,
  snot_fire: 1.63,
  snot_bounce: 1.55,
  snot_splat: 1.75,
  chicken_fire: 0.44,
  chicken_explode: 0.32,
  weapon_switch: 2.12,
  ammo_empty: 0.61,
  // Enemies
  enemy_hit: 1.28,
  enemy_squish: 1.2,
  enemy_pop: 1.41,
  rat_squeak: 1.05,
  toilet_chomp: 1.6,
  blob_split: 1.03,
  turnip_throw: 0.88,
  roach_buzz: 0.69,
  enemy_alert: 0.5,
  // Environment
  barrel_explode: 0.56,
  crate_break: 1.51,
  wall_crumble: 0.97,
  toilet_launch: 0.64,
  vending_clunk: 1.2,
  vending_crash: 0.61,
  hydrant_spray: 0.2,
  fan_whoosh: 0.48,
  sludge_splash: 0.93,
  coin: 1.8,
  gem: 0.53,
  health_pickup: 0.52,
  checkpoint: 0.54,
  // Transformations & bosses
  transform_inflate: 0.26,
  ball_bounce: 1.03,
  ball_smash: 0.72,
  boss_roar: 0.18,
  boss_hit: 0.93,
  boss_explode: 0.46,
  mech_stomp: 0.5,
  plunger_fire: 1.28,
};
