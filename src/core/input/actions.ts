/**
 * Logical game actions. Gameplay never reads keys or buttons directly — it
 * reads an `ActionSnapshot`, which makes rebinding, gamepads, co-op and
 * replays/tests possible without touching gameplay code.
 */
export const ACTIONS = [
  "left",
  "right",
  "up",
  "down",
  "jump",
  "attack",
  "shoot",
  "special",
  "switchWeapon",
  "pause",
] as const;

export type Action = (typeof ACTIONS)[number];

export interface ActionSnapshot {
  /** True while the action is held. */
  held: Readonly<Record<Action, boolean>>;
  /** True only on the frame the action went down. */
  pressed: Readonly<Record<Action, boolean>>;
  /** True only on the frame the action went up. */
  released: Readonly<Record<Action, boolean>>;
  /** Horizontal axis, -1..1 (analog stick aware). */
  moveX: number;
  /** Vertical axis, -1 (up) .. 1 (down). */
  moveY: number;
}

export function emptyActionRecord(): Record<Action, boolean> {
  return Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<Action, boolean>;
}

export function emptySnapshot(): ActionSnapshot {
  return {
    held: emptyActionRecord(),
    pressed: emptyActionRecord(),
    released: emptyActionRecord(),
    moveX: 0,
    moveY: 0,
  };
}

/**
 * Derives pressed/released edges from the previous and current held states.
 * Pure so it can be unit tested and reused by recorded-input playback.
 */
export function nextSnapshot(
  previousHeld: Readonly<Record<Action, boolean>>,
  held: Record<Action, boolean>,
  moveX: number,
  moveY: number,
): ActionSnapshot {
  const pressed = emptyActionRecord();
  const released = emptyActionRecord();
  for (const action of ACTIONS) {
    pressed[action] = held[action] && !previousHeld[action];
    released[action] = !held[action] && previousHeld[action];
  }
  return { held, pressed, released, moveX, moveY };
}
