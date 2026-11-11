/**
 * Melee combo timing. Pure logic: tracks which attack is running, buffers the
 * next press, and reports when the hit window is live. The player entity
 * turns the live window into a world-space hitbox.
 */
import type { MeleeAttack } from "../characters/character-definition";

export interface ComboStep {
  /** Attack that started this tick, if any. */
  started?: MeleeAttack;
  /** True while the current attack's hit window is open. */
  active: boolean;
}

const INPUT_BUFFER = 0.18;

export class MeleeCombo {
  current: MeleeAttack | null = null;
  /** Position in the ground combo, 0-based. */
  index = -1;
  private timer = 0;
  private buffered = 0;
  /** Increments every swing so targets can be hit once per swing. */
  swingId = 0;

  constructor(
    private readonly combo: readonly MeleeAttack[],
    private readonly airAttack: MeleeAttack,
  ) {}

  get busy(): boolean {
    return this.current !== null;
  }

  cancel(): void {
    this.current = null;
    this.index = -1;
    this.buffered = 0;
  }

  update(dt: number, attackPressed: boolean, onGround: boolean): ComboStep {
    if (attackPressed) this.buffered = INPUT_BUFFER;
    else this.buffered = Math.max(0, this.buffered - dt);

    if (this.current) {
      this.timer += dt;
      const canChain =
        onGround &&
        this.index >= 0 &&
        this.index < this.combo.length - 1 &&
        this.timer >= this.current.chainFrom;
      if (canChain && this.buffered > 0) {
        return { started: this.begin(this.index + 1, onGround), active: false };
      }
      if (this.timer >= this.current.duration) {
        this.current = null;
        this.index = -1;
      }
    } else if (this.buffered > 0) {
      return { started: this.begin(0, onGround), active: false };
    }
    const active =
      this.current !== null &&
      this.timer >= this.current.activeFrom &&
      this.timer <= this.current.activeTo;
    return { active };
  }

  private begin(index: number, onGround: boolean): MeleeAttack {
    this.buffered = 0;
    this.timer = 0;
    this.swingId++;
    if (!onGround) {
      this.index = -1;
      this.current = this.airAttack;
    } else {
      this.index = index;
      this.current = this.combo[index]!;
    }
    return this.current;
  }
}
