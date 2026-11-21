/**
 * Data that defines a playable character. Adding a character means adding a
 * definition module + a sprite sheet; the player entity is generic.
 */
import type { SfxId } from "../../audio/audio-types";
import type { MovementTuning } from "../player/movement-tuning";
import type { OwnedWeapon } from "../weapons/weapon-inventory";

export interface HitboxRect {
  /** Relative to the character's feet, facing right. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MeleeAttack {
  /** Animation name on the character's sheet. */
  anim: string;
  /** Total time the attack occupies, in seconds. */
  duration: number;
  /** Hit window, in seconds from the start. */
  activeFrom: number;
  activeTo: number;
  /** When the next attack in the combo may begin. */
  chainFrom: number;
  hitbox: HitboxRect;
  damage: number;
  /** Knockback velocity applied to the target (x is in the attacker's facing direction). */
  knockback: { x: number; y: number };
  /** Horizontal speed multiplier while attacking. */
  moveScale: number;
  /** Forward velocity burst at the start (belly bumps, lunges). */
  lunge?: number;
  /** Screen shake + hit-stop scale for heavy hits (0 = none). */
  impact: number;
  swingSfx: SfxId;
}

export type QuipTrigger =
  | "start"
  | "hurt"
  | "sludge"
  | "hardLand"
  | "bored"
  | "respawn"
  | "doubleJump"
  | "wallJump"
  | "combo"
  | "weaponGet"
  | "upgrade"
  | "outOfAmmo"
  | "megaPunch"
  | "transform"
  | "deflate"
  | "powerUp";

export interface CharacterDefinition {
  id: string;
  name: string;
  /** One-line tagline for menus. */
  tagline: string;
  sheetKey: string;
  maxHealth: number;
  tuning: Partial<MovementTuning>;
  /** Physics body sizes in pixels (width × height, anchored at the feet). */
  body: { stand: { w: number; h: number }; low: { w: number; h: number } };
  combo: readonly MeleeAttack[];
  airAttack: MeleeAttack;
  /** Released after holding punch: the character's heavy signature hit. */
  chargedAttack: MeleeAttack;
  startingWeapons: readonly OwnedWeapon[];
  quips: Readonly<Record<QuipTrigger, readonly string[]>>;
  /** Pitch multiplier for the gibberish voice. */
  voicePitch: number;
}
