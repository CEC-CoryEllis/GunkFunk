/**
 * Arcade kill combo: knockouts in quick succession multiply their points.
 * Pure, so the timing rules are unit tested.
 */
export const COMBO_WINDOW_SECONDS = 2.5;
export const MAX_COMBO_MULTIPLIER = 5;

export class KillCombo {
  private chain = 0;
  private lastKill = Number.NEGATIVE_INFINITY;

  /** Records a knockout at time `now` (seconds) and returns its score multiplier. */
  registerKill(now: number): number {
    this.chain = now - this.lastKill <= COMBO_WINDOW_SECONDS ? this.chain + 1 : 1;
    this.lastKill = now;
    return Math.min(this.chain, MAX_COMBO_MULTIPLIER);
  }

  /** The chain length still alive at `now` (0 once the window has lapsed). */
  activeChain(now: number): number {
    return now - this.lastKill <= COMBO_WINDOW_SECONDS ? this.chain : 0;
  }
}
