/**
 * Decides when a character makes a funny comment. Each trigger has a chance
 * and every quip shares a cooldown, so jokes stay surprising instead of
 * spamming. Lines are drawn without immediate repeats.
 */
import type { QuipTrigger } from "../characters/character-definition";

const COOLDOWN = 6;

const CHANCE: Readonly<Record<QuipTrigger, number>> = {
  start: 1,
  hurt: 0.5,
  sludge: 0.9,
  hardLand: 0.6,
  bored: 1,
  respawn: 1,
  doubleJump: 0.08,
  wallJump: 0.15,
  combo: 0.25,
  weaponGet: 1,
  upgrade: 1,
  outOfAmmo: 1,
  megaPunch: 0.35,
};

export class QuipDirector {
  private cooldown = 0;
  private readonly lastLine = new Map<QuipTrigger, string>();

  constructor(
    private readonly lines: Readonly<Record<QuipTrigger, readonly string[]>>,
    private readonly random: () => number = Math.random,
  ) {}

  tick(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  /** Returns a line to say, or null. `force` ignores chance and cooldown. */
  trigger(trigger: QuipTrigger, force = false): string | null {
    if (!force && (this.cooldown > 0 || this.random() > CHANCE[trigger])) return null;
    const options = this.lines[trigger].filter((l) => l !== this.lastLine.get(trigger));
    const pool = options.length > 0 ? options : this.lines[trigger];
    if (pool.length === 0) return null;
    const line = pool[Math.floor(this.random() * pool.length)]!;
    this.lastLine.set(trigger, line);
    this.cooldown = COOLDOWN;
    return line;
  }
}
