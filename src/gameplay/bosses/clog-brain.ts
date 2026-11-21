/**
 * The Clog's decisions, separate from its body so the fight's rhythm is unit
 * tested. It cycles through a fixed attack pattern — wind up and roll at you
 * (bonking the arena wall leaves it stunned and open to a beating), spit
 * hairballs — and at half health gets angrier: shorter pauses, faster rolls
 * that rebound off a wall once, more hairballs, and coughing up rats.
 */

export type ClogAction =
  | "dormant"
  | "waking"
  | "idle"
  | "windup"
  | "roll"
  | "stunned"
  | "spit"
  | "cough"
  | "defeated";

/** One-shot moments the body acts on. */
export type ClogCue = "roar" | "rollStart" | "rebound" | "bonk" | "spit" | "cough" | "enraged";

interface PhaseTuning {
  idle: number;
  windup: number;
  stunned: number;
  rollSpeed: number;
  /** Wall rebounds before a roll ends in a bonk. */
  rebounds: number;
  spitCount: number;
  pattern: readonly ("roll" | "spit" | "cough")[];
}

export const CLOG_PHASES: Readonly<Record<1 | 2, PhaseTuning>> = {
  1: {
    idle: 1.1,
    windup: 0.7,
    stunned: 2,
    rollSpeed: 220,
    rebounds: 0,
    spitCount: 3,
    pattern: ["roll", "spit", "roll", "spit"],
  },
  2: {
    idle: 0.6,
    windup: 0.45,
    stunned: 1.5,
    rollSpeed: 290,
    rebounds: 1,
    spitCount: 5,
    pattern: ["roll", "spit", "cough", "roll", "spit"],
  },
};

export const WAKE_SECONDS = 1.3;
export const SPIT_SECONDS = 1;
export const SPIT_AT = 0.35;
export const COUGH_SECONDS = 1.3;
export const COUGH_AT = 0.6;
/** A roll that never reaches a wall gives up after this long. */
export const ROLL_MAX_SECONDS = 3.5;
/** At or below this fraction of health, phase two begins. */
export const ENRAGE_AT = 0.5;

export class ClogBrain {
  action: ClogAction = "dormant";
  time = 0;
  phase: 1 | 2 = 1;
  private step = 0;
  private reboundsLeft = 0;

  get tuning(): PhaseTuning {
    return CLOG_PHASES[this.phase];
  }

  /** Vulnerable to full damage (armour is down). */
  get exposed(): boolean {
    return this.action === "stunned";
  }

  /** Touching it hurts. */
  get dangerous(): boolean {
    return this.action !== "dormant" && this.action !== "stunned" && this.action !== "defeated";
  }

  wake(): ClogCue[] {
    if (this.action !== "dormant") return [];
    this.go("waking");
    return ["roar"];
  }

  defeat(): void {
    this.go("defeated");
  }

  reset(): void {
    this.go("dormant");
    this.phase = 1;
    this.step = 0;
  }

  /** Advances one step. `bumpedWall` is true when a roll has just hit an arena wall. */
  update(dt: number, healthFraction: number, bumpedWall: boolean): ClogCue[] {
    const cues: ClogCue[] = [];
    if (this.action === "dormant" || this.action === "defeated") return cues;
    const before = this.time;
    this.time += dt;
    if (this.phase === 1 && healthFraction <= ENRAGE_AT) {
      this.phase = 2;
      this.step = 0;
      cues.push("enraged");
    }
    const crossed = (at: number) => before < at && this.time >= at;
    const t = this.tuning;
    switch (this.action) {
      case "waking":
        if (this.time >= WAKE_SECONDS) this.go("idle");
        break;
      case "idle":
        if (this.time >= t.idle) this.startNextAttack();
        break;
      case "windup":
        if (this.time >= t.windup) {
          this.go("roll");
          this.reboundsLeft = t.rebounds;
          cues.push("rollStart");
        }
        break;
      case "roll":
        if (bumpedWall && this.reboundsLeft > 0) {
          this.reboundsLeft--;
          cues.push("rebound");
        } else if (bumpedWall) {
          this.go("stunned");
          cues.push("bonk");
        } else if (this.time >= ROLL_MAX_SECONDS) {
          this.go("idle");
        }
        break;
      case "stunned":
        if (this.time >= t.stunned) this.go("idle");
        break;
      case "spit":
        if (crossed(SPIT_AT)) cues.push("spit");
        if (this.time >= SPIT_SECONDS) this.go("idle");
        break;
      case "cough":
        if (crossed(COUGH_AT)) cues.push("cough");
        if (this.time >= COUGH_SECONDS) this.go("idle");
        break;
    }
    return cues;
  }

  private startNextAttack(): void {
    const pattern = this.tuning.pattern;
    const attack = pattern[this.step % pattern.length]!;
    this.step++;
    this.go(attack === "roll" ? "windup" : attack);
  }

  private go(action: ClogAction): void {
    this.action = action;
    this.time = 0;
  }
}
