/**
 * The arsenal. Each weapon has three levels; collecting a weapon you already
 * own upgrades it. Upper levels don't just add damage — they change how the
 * weapon plays (spreads, splitting globs, homing chickens).
 */
import type { SfxId } from "../../audio/audio-types";
import type { ProjectileKind } from "./projectile-definitions";
import type { WeaponId, WeaponLevelNumber } from "./weapon-ids";

export { MAX_WEAPON_LEVEL, type WeaponId, type WeaponLevelNumber } from "./weapon-ids";

export interface ShotSpec {
  projectile: ProjectileKind;
  /** Degrees above horizontal; negative aims down. */
  angle: number;
  speed: number;
  /** Vertical offset from the muzzle, in pixels. */
  offsetY?: number;
  scale?: number;
}

export interface WeaponLevel {
  /** Seconds between shots while the trigger is held. */
  fireInterval: number;
  shots: readonly ShotSpec[];
  damageBonus?: number;
  /** Snot L3: globs split into two smaller globs on their first bounce. */
  splitOnBounce?: boolean;
  /** Chicken L3: chickens steer towards the nearest target. */
  homing?: boolean;
  /** Short text shown on the pickup banner when this level is reached. */
  blurb: string;
}

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  maxAmmo: number;
  /** Ammo granted by each pickup. */
  pickupAmmo: number;
  fireSfx: SfxId;
  /** Shown when collected for the first time. */
  tagline: string;
  levels: readonly [WeaponLevel, WeaponLevel, WeaponLevel];
}

export const WEAPONS: Readonly<Record<WeaponId, WeaponDefinition>> = {
  sock: {
    id: "sock",
    name: "SOCK CANNON",
    maxAmmo: 60,
    pickupAmmo: 25,
    fireSfx: "sock_fire",
    tagline: "FIRES DIRTY GYM SOCKS. KNOCKS 'EM FLAT.",
    levels: [
      {
        fireInterval: 0.22,
        shots: [{ projectile: "sock", angle: 0, speed: 330 }],
        blurb: "ONE SOCK",
      },
      {
        fireInterval: 0.2,
        shots: [
          { projectile: "sock", angle: 3, speed: 340, offsetY: -3 },
          { projectile: "sock", angle: -3, speed: 340, offsetY: 3 },
        ],
        blurb: "DOUBLE BARREL!",
      },
      {
        fireInterval: 0.18,
        shots: [
          { projectile: "sock", angle: 10, speed: 350 },
          { projectile: "sock", angle: 0, speed: 360, scale: 1.3 },
          { projectile: "sock", angle: -10, speed: 350 },
        ],
        damageBonus: 1,
        blurb: "TRIPLE-BARREL SOCK STORM!",
      },
    ],
  },
  snot: {
    id: "snot",
    name: "SNOT BLASTER",
    maxAmmo: 40,
    pickupAmmo: 20,
    fireSfx: "snot_fire",
    tagline: "BOUNCING GLOBS OF PREMIUM SLIME.",
    levels: [
      { fireInterval: 0.32, shots: [{ projectile: "snot", angle: 22, speed: 235 }], blurb: "GLOB" },
      {
        fireInterval: 0.3,
        shots: [{ projectile: "snot", angle: 22, speed: 245, scale: 1.5 }],
        damageBonus: 1,
        blurb: "MEGA-GLOBS!",
      },
      {
        fireInterval: 0.28,
        shots: [{ projectile: "snot", angle: 22, speed: 245, scale: 1.5 }],
        damageBonus: 1,
        splitOnBounce: true,
        blurb: "GLOBS SPLIT ON BOUNCE!",
      },
    ],
  },
  chicken: {
    id: "chicken",
    name: "CHICKEN LAUNCHER",
    maxAmmo: 15,
    pickupAmmo: 6,
    fireSfx: "chicken_fire",
    tagline: "RUBBER CHICKENS. THEY EXPLODE. DON'T ASK.",
    levels: [
      {
        fireInterval: 0.55,
        shots: [{ projectile: "chicken", angle: 35, speed: 265 }],
        blurb: "ONE CHICKEN",
      },
      {
        fireInterval: 0.55,
        shots: [
          { projectile: "chicken", angle: 28, speed: 280 },
          { projectile: "chicken", angle: 50, speed: 235 },
        ],
        blurb: "TWO CHICKENS!",
      },
      {
        fireInterval: 0.5,
        shots: [
          { projectile: "chicken", angle: 22, speed: 290 },
          { projectile: "chicken", angle: 38, speed: 265 },
          { projectile: "chicken", angle: 55, speed: 235 },
        ],
        homing: true,
        blurb: "ANGRY HOMING CHICKENS!",
      },
    ],
  },
};

export function weaponLevel(id: WeaponId, level: WeaponLevelNumber): WeaponLevel {
  return WEAPONS[id].levels[level - 1];
}
