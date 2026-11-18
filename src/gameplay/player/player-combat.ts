/**
 * Everything the player does to hurt things, as one state machine: the melee
 * combo, hold-to-charge mega punch, the trigger, weapon switching and the
 * inventory. Decides *what* happens each step; the player entity handles
 * presentation and spawning.
 */
import type { ActionSnapshot } from "../../core/input/actions";
import type { CharacterDefinition, MeleeAttack } from "../characters/character-definition";
import type { Rect } from "../combat/hit-types";
import type { WeaponLevel } from "../weapons/weapon-definitions";
import { type OwnedWeapon, WeaponInventory } from "../weapons/weapon-inventory";
import { WeaponTrigger } from "../weapons/weapon-trigger";
import { ChargeAttack } from "./charge-attack";
import { MeleeCombo } from "./melee-combo";
import type { MovementState } from "./movement-controller";

/** How long the shooting pose lingers after the last shot. */
const SHOOT_POSE_TIME = 0.28;

export interface CombatContext {
  canAct: boolean;
  onGround: boolean;
  state: MovementState;
  crouching: boolean;
}

export interface CombatFrame {
  /** Melee attack that began this step (combo hit, air punch or mega punch). */
  meleeStarted?: MeleeAttack;
  megaStarted: boolean;
  /** Animation override for melee / charging, or null. */
  anim: string | null;
  attack: MeleeAttack | null;
  hitActive: boolean;
  charging: boolean;
  chargeReady: boolean;
  chargeBecameReady: boolean;
  shot?: { weapon: OwnedWeapon; level: WeaponLevel };
  emptyClick: boolean;
  switched?: OwnedWeapon;
  /** Hold a shooting pose (and show the gun). */
  shooting: boolean;
}

export class PlayerCombat {
  readonly inventory: WeaponInventory;
  readonly combo: MeleeCombo;
  private readonly charge = new ChargeAttack();
  private readonly trigger = new WeaponTrigger();
  private shootTimer = 0;

  constructor(private readonly character: CharacterDefinition) {
    this.inventory = new WeaponInventory(character.startingWeapons);
    this.combo = new MeleeCombo(character.combo, character.airAttack);
  }

  get chargeProgress(): number {
    return this.charge.progress;
  }

  cancel(): void {
    this.combo.cancel();
    this.charge.cancel();
    this.shootTimer = 0;
  }

  update(input: ActionSnapshot, dt: number, ctx: CombatContext): CombatFrame {
    const mobile = ctx.state !== "climb" && ctx.state !== "slide";
    const canMelee = ctx.canAct && mobile;

    const charge = this.charge.update(
      dt,
      canMelee && input.held.attack,
      canMelee && !this.combo.busy,
    );
    const mega = charge.release ? this.combo.perform(this.character.chargedAttack) : undefined;
    const step = this.combo.update(dt, canMelee && !mega && input.pressed.attack, ctx.onGround);

    const canShoot = ctx.canAct && mobile && !ctx.crouching && !this.combo.busy && !charge.charging;
    const trigger = this.trigger.update(
      dt,
      canShoot && input.held.shoot,
      canShoot && input.pressed.shoot,
      this.inventory,
    );
    this.shootTimer = trigger.fired ? SHOOT_POSE_TIME : Math.max(0, this.shootTimer - dt);
    if (!canShoot) this.shootTimer = 0;

    const switched =
      ctx.canAct && input.pressed.switchWeapon ? (this.inventory.cycle(1) ?? undefined) : undefined;

    const attack = this.combo.current;
    return {
      meleeStarted: mega ?? step.started,
      megaStarted: mega !== undefined,
      anim: attack?.anim ?? (charge.charging ? "charge" : null),
      attack,
      hitActive: step.active,
      charging: charge.charging,
      chargeReady: charge.ready,
      chargeBecameReady: charge.becameReady,
      shot: trigger.fired,
      emptyClick: trigger.empty,
      switched,
      shooting: this.shootTimer > 0,
    };
  }

  /** World-space hitbox of the live melee attack. */
  hitbox(x: number, y: number, facing: 1 | -1, active: boolean): Rect | null {
    const attack = this.combo.current;
    if (!attack || !active) return null;
    const hb = attack.hitbox;
    return { x: facing > 0 ? x + hb.x : x - hb.x - hb.w, y: y + hb.y, width: hb.w, height: hb.h };
  }
}
