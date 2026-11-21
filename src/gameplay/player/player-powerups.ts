/**
 * The power-ups Bulgo is running and their effects on his own systems.
 * Infinite Socks and Hyper Grease are applied here (weapon inventory and
 * movement tuning); the Wrecking Ball is a form, which the player entity
 * swaps in when this reports it started. Pure, so it's unit tested.
 */
import { type ActivePowerUp, PowerUpTimers } from "../powerups/powerup-timers";
import type { PowerUpId } from "../powerups/powerup-ids";
import type { WeaponInventory } from "../weapons/weapon-inventory";
import type { MovementController } from "./movement-controller";
import type { MovementTuning } from "./movement-tuning";

/** Infinite Socks fires this much faster. */
export const SOCK_RAPID_FIRE = 0.45;

/** Hyper Grease: much faster, quick to get going, and very slow to stop. */
export function greasedTuning(base: MovementTuning): MovementTuning {
  return {
    ...base,
    runSpeed: base.runSpeed * 1.55,
    groundAccel: base.groundAccel * 1.2,
    groundDecel: base.groundDecel * 0.18,
    turnAccel: base.turnAccel * 0.35,
    airAccel: base.airAccel * 1.1,
    slideSpeed: base.slideSpeed * 1.4,
    slideDuration: base.slideDuration * 1.8,
  };
}

export class PlayerPowerUps {
  private readonly timers = new PowerUpTimers();
  private readonly baseTuning: MovementTuning;

  constructor(
    private readonly inventory: WeaponInventory,
    private readonly movement: MovementController,
  ) {
    this.baseTuning = movement.tuning;
  }

  /** Starts or refreshes a power-up. Returns true if it wasn't already running. */
  activate(id: PowerUpId): boolean {
    const fresh = this.timers.activate(id);
    this.apply(id, true);
    return fresh;
  }

  /** Counts down; returns the power-ups that just ran out (their effects are already removed). */
  tick(dt: number): PowerUpId[] {
    const expired = this.timers.tick(dt);
    for (const id of expired) this.apply(id, false);
    return expired;
  }

  /** Ends one early. Returns true if it was running. */
  end(id: PowerUpId): boolean {
    if (!this.timers.end(id)) return false;
    this.apply(id, false);
    return true;
  }

  /** Ends everything (death, respawn). Returns what was running. */
  clear(): PowerUpId[] {
    const ended = this.timers.clear();
    for (const id of ended) this.apply(id, false);
    return ended;
  }

  isActive(id: PowerUpId): boolean {
    return this.timers.isActive(id);
  }

  remainingOf(id: PowerUpId): number {
    return this.timers.remainingOf(id);
  }

  list(): ActivePowerUp[] {
    return this.timers.list();
  }

  private apply(id: PowerUpId, on: boolean): void {
    if (id === "infiniteSocks") {
      if (on) this.inventory.equip("sock");
      this.inventory.infiniteAmmo = on;
      this.inventory.fireIntervalScale = on ? SOCK_RAPID_FIRE : 1;
    } else if (id === "hyperGrease") {
      this.movement.tuning = on ? greasedTuning(this.baseTuning) : this.baseTuning;
    }
  }
}
