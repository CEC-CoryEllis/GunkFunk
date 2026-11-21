/**
 * Which weapons the player carries, their levels and ammo. Pure so the rules
 * (collect, upgrade, cap ammo, cycle, consume) are unit tested.
 */
import {
  MAX_WEAPON_LEVEL,
  WEAPONS,
  type WeaponId,
  type WeaponLevelNumber,
} from "./weapon-definitions";

export interface OwnedWeapon {
  id: WeaponId;
  level: WeaponLevelNumber;
  ammo: number;
}

export type CollectKind = "new" | "upgraded" | "ammo";

export interface CollectOutcome {
  kind: CollectKind;
  weapon: OwnedWeapon;
}

export class WeaponInventory {
  private readonly owned: OwnedWeapon[] = [];
  private index = 0;
  /** Set by the Infinite Socks power-up: firing costs nothing. */
  infiniteAmmo = false;
  /** Multiplies every weapon's fire interval (Infinite Socks fires faster). */
  fireIntervalScale = 1;

  constructor(start: readonly OwnedWeapon[] = []) {
    for (const weapon of start) this.owned.push({ ...weapon });
  }

  get current(): OwnedWeapon | null {
    return this.owned[this.index] ?? null;
  }

  get all(): readonly OwnedWeapon[] {
    return this.owned;
  }

  /** Picking up a weapon: new → added at level 1; owned → level up (or just ammo when maxed). Always equips it. */
  collect(id: WeaponId): CollectOutcome {
    const def = WEAPONS[id];
    const existing = this.owned.findIndex((w) => w.id === id);
    if (existing < 0) {
      const weapon: OwnedWeapon = { id, level: 1, ammo: def.pickupAmmo };
      this.owned.push(weapon);
      this.index = this.owned.length - 1;
      return { kind: "new", weapon };
    }
    const weapon = this.owned[existing]!;
    this.index = existing;
    weapon.ammo = Math.min(def.maxAmmo, weapon.ammo + def.pickupAmmo);
    if (weapon.level < MAX_WEAPON_LEVEL) {
      weapon.level = (weapon.level + 1) as WeaponLevelNumber;
      return { kind: "upgraded", weapon };
    }
    return { kind: "ammo", weapon };
  }

  /** Selects a weapon, adding it at level 1 with pickup ammo if it isn't carried yet (never upgrades). */
  equip(id: WeaponId): OwnedWeapon {
    let index = this.owned.findIndex((w) => w.id === id);
    if (index < 0) {
      this.owned.push({ id, level: 1, ammo: WEAPONS[id].pickupAmmo });
      index = this.owned.length - 1;
    }
    this.index = index;
    return this.owned[index]!;
  }

  /** Switches to the next (or previous) weapon. Returns the new current weapon. */
  cycle(direction: 1 | -1 = 1): OwnedWeapon | null {
    if (this.owned.length === 0) return null;
    this.index = (this.index + direction + this.owned.length) % this.owned.length;
    return this.current;
  }

  /** Spends ammo for one trigger pull. Returns false (and spends nothing) when empty. */
  consume(cost = 1): boolean {
    const weapon = this.current;
    if (!weapon) return false;
    if (this.infiniteAmmo) return true;
    if (weapon.ammo < cost) return false;
    weapon.ammo -= cost;
    return true;
  }
}
