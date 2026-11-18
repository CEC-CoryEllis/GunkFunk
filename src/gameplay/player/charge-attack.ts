/**
 * Hold-to-charge timing for Bulgo's mega punch. A tap still throws the normal
 * jab; keep holding and he winds up, puffs his cheeks and sweats; release once
 * fully charged and the arm goes off like a rubber cannon.
 */

/** Hold time before the wind-up pose starts (lets taps stay taps). */
export const CHARGE_START = 0.3;
/** Hold time until the punch is ready. */
export const CHARGE_FULL = 0.9;

export interface ChargeStep {
  /** Show the wind-up. */
  charging: boolean;
  ready: boolean;
  /** True on the step the charge became ready (flash + sound). */
  becameReady: boolean;
  /** True on the step a fully charged punch was released. */
  release: boolean;
}

export class ChargeAttack {
  private held = 0;

  get progress(): number {
    return Math.min(1, this.held / CHARGE_FULL);
  }

  cancel(): void {
    this.held = 0;
  }

  /**
   * @param attackHeld whether the punch button is down
   * @param canCharge false while another attack is still playing, climbing, sliding, hurt…
   */
  update(dt: number, attackHeld: boolean, canCharge: boolean): ChargeStep {
    const wasReady = this.held >= CHARGE_FULL;
    if (attackHeld) {
      // Time keeps counting through the opening jab so holding feels continuous.
      this.held += dt;
      const charging = canCharge && this.held >= CHARGE_START;
      const ready = charging && this.held >= CHARGE_FULL;
      return { charging, ready, becameReady: ready && !wasReady, release: false };
    }
    const release = wasReady && canCharge;
    this.held = 0;
    return { charging: false, ready: false, becameReady: false, release };
  }
}
