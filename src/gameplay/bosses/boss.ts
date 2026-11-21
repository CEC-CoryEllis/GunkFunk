/**
 * What every boss offers its arena: the shared damage interface plus a name
 * and health for the HUD bar, a dormant → fighting → defeated lifecycle, and
 * a way to reset if Bulgo loses a life mid-fight.
 */
import type { Damageable } from "../combat/hit-types";
import type { StageEntity } from "../stage/stage-context";

export interface BossStatus {
  name: string;
  health: number;
  maxHealth: number;
}

export interface Boss extends Damageable, StageEntity {
  readonly name: string;
  readonly health: number;
  readonly maxHealth: number;
  /** Health ran out (the defeat sequence may still be playing). */
  readonly defeated: boolean;
  /** The defeat sequence has finished and the boss has left the stage. */
  readonly gone: boolean;
  /** Wakes the boss up: the fight is on. */
  engage(): void;
  /** Back to full health and asleep at its starting spot (Bulgo lost a life). */
  reset(): void;
}
