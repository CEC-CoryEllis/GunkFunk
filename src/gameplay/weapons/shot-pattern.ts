/**
 * Turns one trigger pull into projectile launch requests: the weapon level's
 * shot list, mirrored for facing and offset from the muzzle. Pure.
 */
import type { Team } from "../combat/hit-types";
import { launchVelocity } from "./projectile-motion";
import type { FireRequest } from "./projectile-system";
import type { WeaponLevel } from "./weapon-definitions";

export function shotRequests(
  level: WeaponLevel,
  muzzle: { x: number; y: number },
  facing: 1 | -1,
  team: Team,
): FireRequest[] {
  return level.shots.map((shot) => {
    const { vx, vy } = launchVelocity(shot.angle, shot.speed, facing);
    return {
      kind: shot.projectile,
      x: muzzle.x,
      y: muzzle.y + (shot.offsetY ?? 0),
      vx,
      vy,
      team,
      scale: shot.scale ?? 1,
      damageBonus: level.damageBonus ?? 0,
      splitOnBounce: level.splitOnBounce ?? false,
      homing: level.homing ?? false,
    };
  });
}
