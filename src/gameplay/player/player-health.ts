/**
 * Hit points with post-hit invulnerability. Pure; the player entity handles
 * knockback, flashing and death presentation.
 */
export const INVULNERABLE_AFTER_HIT = 1.3;
export const INVULNERABLE_AFTER_RESPAWN = 2;

export class PlayerHealth {
  health: number;
  invulnerable = 0;

  constructor(readonly maxHealth: number) {
    this.health = maxHealth;
  }

  get dead(): boolean {
    return this.health <= 0;
  }

  tick(dt: number): void {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
  }

  /** Returns true if the damage was applied. */
  damage(amount: number): boolean {
    if (this.invulnerable > 0 || this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = INVULNERABLE_AFTER_HIT;
    return true;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  restore(): void {
    this.health = this.maxHealth;
    this.invulnerable = INVULNERABLE_AFTER_RESPAWN;
  }
}
