/**
 * Turns one combat step into world effects: shots leave the held weapon's
 * muzzle as projectiles, and the live melee hitbox strikes through the combat
 * world. The decisions were already made by `PlayerCombat`.
 */
import { presentHit } from "../combat/hit-feedback";
import type { HitInfo, Team } from "../combat/hit-types";
import type { StageContext } from "../stage/stage-context";
import type { HeldWeapon } from "../weapons/held-weapon";
import type { WeaponLevel } from "../weapons/weapon-definitions";
import { shotRequests } from "../weapons/shot-pattern";
import type { CombatFrame, PlayerCombat } from "./player-combat";

export interface Attacker {
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly team: Team;
}

export function fireShots(
  ctx: StageContext,
  held: HeldWeapon,
  level: WeaponLevel,
  attacker: Attacker,
): void {
  const muzzle = held.muzzle(attacker.x, attacker.y, attacker.facing);
  for (const request of shotRequests(level, muzzle, attacker.facing, attacker.team)) {
    ctx.projectiles.fire(request);
  }
}

export function landMelee(
  ctx: StageContext,
  combat: PlayerCombat,
  frame: CombatFrame,
  attacker: Attacker,
): void {
  const { x, y, facing } = attacker;
  const area = combat.hitbox(x, y, facing, frame.hitActive);
  const attack = frame.attack;
  if (!area || !attack) return;
  const hit: HitInfo = {
    key: `melee-${combat.combo.swingId}`,
    team: attacker.team,
    kind: "melee",
    damage: attack.damage,
    knockbackX: facing * attack.knockback.x,
    knockbackY: attack.knockback.y,
    x: area.x + (facing > 0 ? area.width : 0),
    y: area.y + area.height / 2,
    impact: attack.impact,
  };
  for (const outcome of ctx.combat.strike(area, hit)) presentHit(ctx.fx, hit, outcome.result);
}
