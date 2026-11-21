/**
 * Active power-ups and their countdowns. Pure, so the stacking and expiry
 * rules are unit tested: several power-ups can run at once, collecting an
 * active one refreshes it, and `tick` reports which ran out.
 */
import { POWERUPS } from "./powerup-definitions";
import type { PowerUpId } from "./powerup-ids";

export interface ActivePowerUp {
  id: PowerUpId;
  remaining: number;
  duration: number;
}

export class PowerUpTimers {
  private readonly remaining = new Map<PowerUpId, number>();

  /** Starts (or refreshes) a power-up. Returns true if it wasn't already running. */
  activate(id: PowerUpId): boolean {
    const fresh = !this.remaining.has(id);
    this.remaining.set(id, POWERUPS[id].duration);
    return fresh;
  }

  /** Counts every active power-up down; returns the ones that just ran out. */
  tick(dt: number): PowerUpId[] {
    const expired: PowerUpId[] = [];
    for (const [id, left] of this.remaining) {
      const next = left - dt;
      if (next <= 0) {
        this.remaining.delete(id);
        expired.push(id);
      } else {
        this.remaining.set(id, next);
      }
    }
    return expired;
  }

  /** Ends a power-up early (the Wrecking Ball pops). Returns true if it was running. */
  end(id: PowerUpId): boolean {
    return this.remaining.delete(id);
  }

  isActive(id: PowerUpId): boolean {
    return this.remaining.has(id);
  }

  remainingOf(id: PowerUpId): number {
    return this.remaining.get(id) ?? 0;
  }

  /** Everything running, in activation order (the HUD's timer row). */
  list(): ActivePowerUp[] {
    return Array.from(this.remaining, ([id, remaining]) => ({
      id,
      remaining,
      duration: POWERUPS[id].duration,
    }));
  }

  clear(): PowerUpId[] {
    const ended = Array.from(this.remaining.keys());
    this.remaining.clear();
    return ended;
  }
}
