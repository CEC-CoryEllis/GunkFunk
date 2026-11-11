/**
 * Default control bindings. Keyboard codes are `KeyboardEvent.code` names so
 * layouts (AZERTY etc.) map by physical position.
 */
import type { Action } from "./actions";

export interface Bindings {
  keys: Readonly<Record<Action, readonly string[]>>;
  /** Standard-mapping gamepad button indices. */
  buttons: Readonly<Record<Action, readonly number[]>>;
}

export const PLAYER_ONE_BINDINGS: Bindings = {
  keys: {
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    up: ["ArrowUp", "KeyW"],
    down: ["ArrowDown", "KeyS"],
    jump: ["KeyZ", "Space", "KeyJ"],
    attack: ["KeyX", "KeyK"],
    shoot: ["KeyC", "KeyL"],
    special: ["KeyV", "KeyI"],
    switchWeapon: ["ShiftLeft", "ShiftRight", "KeyE"],
    pause: ["Enter", "Escape", "KeyP"],
  },
  buttons: {
    left: [14],
    right: [15],
    up: [12],
    down: [13],
    jump: [0], // A / Cross
    attack: [2], // X / Square
    shoot: [1], // B / Circle
    special: [3], // Y / Triangle
    switchWeapon: [4, 5], // LB / RB
    pause: [9], // Start
  },
};

/**
 * Human-readable control summary for menus and the README. Only lists what is
 * implemented — shoot / special / weapon switch arrive with M4 and M7.
 */
export const CONTROL_HINTS: readonly [string, string][] = [
  ["MOVE", "ARROWS / WASD"],
  ["JUMP", "Z / SPACE  (x2!)"],
  ["PUNCH COMBO", "X  (TAP 3X)"],
  ["SLIDE", "DOWN WHILE RUNNING"],
  ["DROP DOWN", "DOWN + JUMP"],
  ["CLIMB", "UP / DOWN ON LADDER"],
  ["WALL JUMP", "JUMP ON A WALL"],
  ["PAUSE", "ENTER / ESC"],
];
