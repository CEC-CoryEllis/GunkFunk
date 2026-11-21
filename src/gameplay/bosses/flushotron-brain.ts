/**
 * The Flush-o-Tron 3000's decisions, separate from its many moving parts so
 * the whole fight's rhythm is unit tested. Data-driven: every action has a
 * duration and a timeline of cues the body acts on.
 *
 *   intro       Stinkbottom gloats; name card
 *   phase 1     on legs: walk, STOMP (floor shockwaves), PLUNGE (plunger
 *               slams in front), LOB flush bombs, then VENT — kneels with its
 *               core exposed
 *   breakdown 1 the legs blow off, the arena's fragile grates are smashed
 *   phase 2     on rocket jets: hover, BOMB from above, DIVE at Bulgo, then
 *               OVERHEAT — sputters down to the floor, exposed
 *   breakdown 2 it crashes, the middle of the floor collapses into sludge,
 *               the tank lid blows off
 *   phase 3     the wreck hops about on a spring with Stinkbottom exposed,
 *               throwing flasks and firing homing plungers — no armour left
 */

export type TronPhase = 1 | 2 | 3;

export type TronAction =
  | "dormant"
  | "intro"
  | "walk"
  | "stomp"
  | "plunge"
  | "lob"
  | "vent"
  | "breakdown1"
  | "hover"
  | "bomb"
  | "dive"
  | "overheat"
  | "breakdown2"
  | "hop"
  | "flasks"
  | "missiles"
  | "defeated";

export type TronCue =
  | "taunt1"
  | "taunt2"
  | "nameCard"
  | "stompWindup"
  | "stompSlam"
  | "plungeOut"
  | "plungeIn"
  | "lobShot"
  | "ventStart"
  | "legsOff"
  | "gratesSmash"
  | "bombDrop"
  | "diveStart"
  | "overheatStart"
  | "crash"
  | "floorCollapse"
  | "lidOff"
  | "hopStart"
  | "flaskThrow"
  | "missileFire";

interface ActionSpec {
  duration: number;
  cues?: readonly (readonly [number, TronCue])[];
}

export const TRON_ACTIONS: Readonly<
  Record<Exclude<TronAction, "dormant" | "defeated">, ActionSpec>
> = {
  intro: {
    duration: 4.6,
    cues: [
      [0.3, "taunt1"],
      [2, "taunt2"],
      [3.1, "nameCard"],
    ],
  },
  walk: { duration: 1.4 },
  stomp: {
    duration: 1.3,
    cues: [
      [0.05, "stompWindup"],
      [0.55, "stompSlam"],
    ],
  },
  plunge: {
    duration: 1.4,
    cues: [
      [0.4, "plungeOut"],
      [1, "plungeIn"],
    ],
  },
  lob: {
    duration: 1.4,
    cues: [
      [0.3, "lobShot"],
      [0.6, "lobShot"],
      [0.9, "lobShot"],
    ],
  },
  vent: { duration: 2.6, cues: [[0, "ventStart"]] },
  breakdown1: {
    duration: 2.6,
    cues: [
      [0.6, "legsOff"],
      [1.4, "gratesSmash"],
    ],
  },
  hover: { duration: 1.6 },
  bomb: {
    duration: 2.2,
    cues: [
      [0.3, "bombDrop"],
      [0.75, "bombDrop"],
      [1.2, "bombDrop"],
      [1.65, "bombDrop"],
    ],
  },
  dive: { duration: 1.6, cues: [[0.45, "diveStart"]] },
  overheat: { duration: 2.6, cues: [[0, "overheatStart"]] },
  breakdown2: {
    duration: 3,
    cues: [
      [0.3, "crash"],
      [1.2, "floorCollapse"],
      [2.1, "lidOff"],
    ],
  },
  hop: { duration: 1.1, cues: [[0, "hopStart"]] },
  flasks: {
    duration: 1.4,
    cues: [
      [0.4, "flaskThrow"],
      [0.9, "flaskThrow"],
    ],
  },
  missiles: {
    duration: 1.4,
    cues: [
      [0.5, "missileFire"],
      [0.9, "missileFire"],
    ],
  },
};

export const TRON_PATTERNS: Readonly<Record<TronPhase, readonly TronAction[]>> = {
  1: ["walk", "stomp", "walk", "plunge", "lob", "vent"],
  2: ["hover", "bomb", "hover", "dive", "overheat"],
  3: ["hop", "flasks", "hop", "missiles", "hop", "hop"],
};

export const TRON_MAX_HEALTH = 48;
/** Health at which each phase ends (a phase can't be skipped by one huge hit). */
export const PHASE_FLOOR: Readonly<Record<TronPhase, number>> = { 1: 32, 2: 16, 3: 0 };

const PROTECTED: ReadonlySet<TronAction> = new Set([
  "dormant",
  "intro",
  "breakdown1",
  "breakdown2",
  "defeated",
]);

export class FlushOTronBrain {
  action: TronAction = "dormant";
  time = 0;
  phase: TronPhase = 1;
  private step = 0;

  /** Takes no damage at all (cutscenes and breakdowns). */
  get invulnerable(): boolean {
    return PROTECTED.has(this.action);
  }

  /** Takes full damage: venting, overheating, or anything once it's a wreck. */
  get exposed(): boolean {
    if (this.invulnerable) return false;
    return this.phase === 3 || this.action === "vent" || this.action === "overheat";
  }

  /** Touching it hurts. */
  get dangerous(): boolean {
    return !this.invulnerable && this.action !== "vent" && this.action !== "overheat";
  }

  /** Health this phase can't drop below until its breakdown has played. */
  get healthFloor(): number {
    return PHASE_FLOOR[this.phase];
  }

  wake(): TronCue[] {
    if (this.action !== "dormant") return [];
    this.go("intro");
    return this.cuesBetween(-1, 0);
  }

  defeat(): void {
    this.go("defeated");
  }

  reset(): void {
    this.go("dormant");
    this.phase = 1;
    this.step = 0;
  }

  update(dt: number, health: number): TronCue[] {
    if (this.action === "dormant" || this.action === "defeated") return [];
    const before = this.time;
    this.time += dt;
    const cues = this.cuesBetween(before, this.time);
    if (!this.invulnerable && this.phase < 3 && health <= this.healthFloor) {
      this.go(this.phase === 1 ? "breakdown1" : "breakdown2");
      return [...cues, ...this.cuesBetween(-1, 0)];
    }
    const spec = TRON_ACTIONS[this.action as keyof typeof TRON_ACTIONS];
    if (this.time < spec.duration) return cues;
    if (this.action === "breakdown1") this.enterPhase(2);
    else if (this.action === "breakdown2") this.enterPhase(3);
    this.next();
    return [...cues, ...this.cuesBetween(-1, 0)];
  }

  private enterPhase(phase: TronPhase): void {
    this.phase = phase;
    this.step = 0;
  }

  private next(): void {
    const pattern = TRON_PATTERNS[this.phase];
    this.go(pattern[this.step % pattern.length]!);
    this.step++;
  }

  /** Cues whose time falls in (from, to] for the current action. */
  private cuesBetween(from: number, to: number): TronCue[] {
    const spec = TRON_ACTIONS[this.action as keyof typeof TRON_ACTIONS];
    return (spec?.cues ?? []).filter(([at]) => at > from && at <= to).map(([, cue]) => cue);
  }

  private go(action: TronAction): void {
    this.action = action;
    this.time = 0;
  }
}
