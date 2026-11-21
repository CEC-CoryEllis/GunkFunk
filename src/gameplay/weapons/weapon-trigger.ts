/**
 * Trigger timing: holding fire auto-repeats at the weapon level's rate, the
 * first press always fires immediately, and an empty gun "clicks" once per
 * press rather than every frame.
 */
import { type WeaponLevel, weaponLevel } from "./weapon-definitions";
import type { OwnedWeapon, WeaponInventory } from "./weapon-inventory";

export interface TriggerResult {
  fired?: { weapon: OwnedWeapon; level: WeaponLevel };
  /** True on the press that found the gun empty. */
  empty: boolean;
}

export class WeaponTrigger {
  private cooldown = 0;

  reset(): void {
    this.cooldown = 0;
  }

  update(dt: number, held: boolean, pressed: boolean, inventory: WeaponInventory): TriggerResult {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const weapon = inventory.current;
    if (!weapon || !held || this.cooldown > 0) return { empty: false };
    if (!inventory.consume(1)) return { empty: pressed };
    const level = weaponLevel(weapon.id, weapon.level);
    this.cooldown = level.fireInterval * inventory.fireIntervalScale;
    return { fired: { weapon: { ...weapon }, level }, empty: false };
  }
}
