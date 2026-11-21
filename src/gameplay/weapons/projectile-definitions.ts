/**
 * How each projectile flies and what happens when it connects. Weapons fire
 * these; levels change how many, how big and with which extra behaviours.
 */
import type { SfxId } from "../../audio/audio-types";
import type { ParticleKind } from "../fx/effects";

export type ProjectileKind = "sock" | "snot" | "snotSmall" | "chicken" | "stinkBomb" | "hairball";

export type ImpactBehaviour = "vanish" | "splat" | "explode";

export interface ProjectileDefinition {
  kind: ProjectileKind;
  /** Sprite sheet + looping flight animation. */
  sheetKey: string;
  anim: string;
  /** Hitbox half-size at scale 1. */
  radius: number;
  gravity: number;
  maxBounces: number;
  /** Velocity kept after a bounce (0..1). */
  bounciness: number;
  /** Horizontal velocity kept when bouncing off a floor. */
  friction: number;
  /** Seconds before the projectile expires (exploding ones explode). */
  lifetime: number;
  damage: number;
  /** Knockback; x is applied in the projectile's direction of travel. */
  knockback: { x: number; y: number };
  impact: number;
  onImpact: ImpactBehaviour;
  explosionRadius?: number;
  hitSfx: SfxId;
  bounceSfx?: SfxId;
  particle: ParticleKind;
  words: readonly string[];
  /** Rotate the sprite to face its velocity (socks, chickens). */
  faceVelocity: boolean;
}

export const PROJECTILES: Readonly<Record<ProjectileKind, ProjectileDefinition>> = {
  sock: {
    kind: "sock",
    sheetKey: "projectiles",
    anim: "sock",
    radius: 5,
    gravity: 0,
    maxBounces: 0,
    bounciness: 0,
    friction: 1,
    lifetime: 0.9,
    damage: 1,
    knockback: { x: 260, y: -140 },
    impact: 0.35,
    onImpact: "vanish",
    hitSfx: "sock_hit",
    particle: "lint",
    words: ["THWAP!", "SOCKED!", "FWAP!"],
    faceVelocity: true,
  },
  snot: {
    kind: "snot",
    sheetKey: "projectiles",
    anim: "snot",
    radius: 5,
    gravity: 720,
    maxBounces: 3,
    bounciness: 0.72,
    friction: 0.92,
    lifetime: 2.6,
    damage: 1,
    knockback: { x: 70, y: -60 },
    impact: 0.25,
    onImpact: "splat",
    hitSfx: "snot_splat",
    bounceSfx: "snot_bounce",
    particle: "slime",
    words: ["SPLAT!", "SNORK!", "GLORP!"],
    faceVelocity: false,
  },
  snotSmall: {
    kind: "snotSmall",
    sheetKey: "projectiles",
    anim: "snot",
    radius: 3.5,
    gravity: 720,
    maxBounces: 2,
    bounciness: 0.7,
    friction: 0.92,
    lifetime: 1.6,
    damage: 1,
    knockback: { x: 50, y: -40 },
    impact: 0.2,
    onImpact: "splat",
    hitSfx: "snot_splat",
    bounceSfx: "snot_bounce",
    particle: "slime",
    words: ["SPLUT!"],
    faceVelocity: false,
  },
  chicken: {
    kind: "chicken",
    sheetKey: "projectiles",
    anim: "chicken",
    radius: 6,
    gravity: 620,
    maxBounces: 1,
    bounciness: 0.5,
    friction: 0.8,
    lifetime: 1.4,
    damage: 2,
    knockback: { x: 220, y: -280 },
    impact: 0.8,
    onImpact: "explode",
    explosionRadius: 30,
    hitSfx: "chicken_explode",
    bounceSfx: "chicken_fire",
    particle: "feather",
    words: ["BAWK!", "KA-BAWK!", "CLUCK!"],
    faceVelocity: true,
  },
  /** Thrown by Turnip Grenadiers: lobbed, bursts into a cloud of stench. */
  stinkBomb: {
    kind: "stinkBomb",
    sheetKey: "projectiles",
    anim: "stink_bomb",
    radius: 4,
    gravity: 600,
    maxBounces: 0,
    bounciness: 0,
    friction: 1,
    lifetime: 3,
    damage: 1,
    knockback: { x: 120, y: -200 },
    impact: 0.5,
    onImpact: "explode",
    explosionRadius: 20,
    hitSfx: "burp",
    particle: "stink",
    words: ["PEE-YEW!", "STINKY!"],
    faceVelocity: false,
  },
  /** Spat by The Clog: a wet gob of hair that bounces twice, then splats. */
  hairball: {
    kind: "hairball",
    sheetKey: "projectiles",
    anim: "hairball",
    radius: 4,
    gravity: 700,
    maxBounces: 2,
    bounciness: 0.55,
    friction: 0.8,
    lifetime: 3.5,
    damage: 1,
    knockback: { x: 140, y: -180 },
    impact: 0.4,
    onImpact: "splat",
    hitSfx: "snot_splat",
    particle: "splinter",
    words: ["HAIRY!", "GROSS!"],
    faceVelocity: false,
  },
};
