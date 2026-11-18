/**
 * Resolves attacks against everything that can be hurt. Pure: entities
 * register themselves, attackers call `strike` with an area and a `HitInfo`.
 */
import {
  type Damageable,
  type HitInfo,
  type HitResult,
  type Rect,
  type Team,
  overlaps,
} from "./hit-types";

/** How long a hit key is remembered before it can hit the same target again. */
const KEY_MEMORY_SECONDS = 2;

export interface StrikeOutcome {
  target: Damageable;
  result: HitResult;
}

export class CombatWorld {
  private readonly targets = new Set<Damageable>();
  private readonly struck = new Map<string, { targets: Set<Damageable>; age: number }>();

  register(target: Damageable): void {
    this.targets.add(target);
  }

  unregister(target: Damageable): void {
    this.targets.delete(target);
  }

  /** Ages hit-key memory; call once per fixed step. */
  tick(dt: number): void {
    for (const [key, entry] of this.struck) {
      entry.age += dt;
      if (entry.age > KEY_MEMORY_SECONDS) this.struck.delete(key);
    }
  }

  /** Hits every eligible target overlapping `area`. Returns only the targets actually touched. */
  strike(area: Rect, hit: HitInfo): StrikeOutcome[] {
    const outcomes: StrikeOutcome[] = [];
    let memory = this.struck.get(hit.key);
    for (const target of this.targets) {
      if (target.team === hit.team || !target.targetable) continue;
      if (memory?.targets.has(target)) continue;
      if (!overlaps(area, target.hurtbox())) continue;
      if (!memory) {
        memory = { targets: new Set(), age: 0 };
        this.struck.set(hit.key, memory);
      }
      memory.targets.add(target);
      outcomes.push({ target, result: target.takeHit(hit) });
    }
    return outcomes;
  }

  /** True if any hittable target of another team overlaps the area (proximity fuses). */
  overlapsAny(area: Rect, attackerTeam: Team): boolean {
    for (const target of this.targets) {
      if (target.team !== attackerTeam && target.targetable && overlaps(area, target.hurtbox())) {
        return true;
      }
    }
    return false;
  }

  /** Nearest hittable target to a point (homing projectiles). */
  nearest(x: number, y: number, attackerTeam: Team, maxDistance: number): Damageable | null {
    let best: Damageable | null = null;
    let bestDist = maxDistance;
    for (const target of this.targets) {
      if (target.team === attackerTeam || !target.targetable) continue;
      const box = target.hurtbox();
      const d = Math.hypot(box.x + box.width / 2 - x, box.y + box.height / 2 - y);
      if (d < bestDist) {
        bestDist = d;
        best = target;
      }
    }
    return best;
  }

  get size(): number {
    return this.targets.size;
  }
}
