/**
 * Polls the keyboard and a gamepad once per frame and produces an
 * `ActionSnapshot`. One instance per player.
 *
 * Keyboard state is tracked from DOM events (by `code`) rather than Phaser Key
 * objects so bindings can be any physical key without pre-registration.
 */
import * as Phaser from "phaser";
import {
  ACTIONS,
  type Action,
  type ActionSnapshot,
  emptyActionRecord,
  emptySnapshot,
  nextSnapshot,
} from "./actions";
import type { Bindings } from "./bindings";

const STICK_DEADZONE = 0.3;

export class InputSource {
  private readonly down = new Set<string>();
  /**
   * Keys pressed since the last poll. A tap shorter than one frame (keydown and
   * keyup between two polls) would otherwise be lost entirely.
   */
  private readonly tapped = new Set<string>();
  private previousHeld = emptyActionRecord();
  private current: ActionSnapshot = emptySnapshot();
  private readonly onKeyDown = (e: KeyboardEvent) => {
    this.down.add(e.code);
    this.tapped.add(e.code);
    if (this.isBound(e.code)) {
      e.preventDefault();
    }
  };
  private readonly onKeyUp = (e: KeyboardEvent) => this.down.delete(e.code);
  private readonly onBlur = () => this.down.clear();
  /** Scripted input injected by tests / demo playback; merged with real input. */
  private readonly scripted = new Set<Action>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bindings: Bindings,
    private readonly padIndex = 0,
  ) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  get snapshot(): ActionSnapshot {
    return this.current;
  }

  /** Call once per frame before gameplay reads `snapshot`. */
  poll(): ActionSnapshot {
    const held = emptyActionRecord();
    const pad = this.pad();
    for (const action of ACTIONS) {
      held[action] =
        this.scripted.has(action) ||
        this.bindings.keys[action].some((code) => this.down.has(code) || this.tapped.has(code)) ||
        (pad !== undefined && this.bindings.buttons[action].some((i) => pad.buttons[i]?.pressed));
    }
    let moveX = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    let moveY = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    if (pad) {
      const ax = pad.axes[0]?.getValue() ?? 0;
      const ay = pad.axes[1]?.getValue() ?? 0;
      if (Math.abs(ax) > STICK_DEADZONE) {
        moveX = ax;
        held.left ||= ax < 0;
        held.right ||= ax > 0;
      }
      if (Math.abs(ay) > STICK_DEADZONE) {
        moveY = ay;
        held.up ||= ay < -0.6;
        held.down ||= ay > 0.6;
      }
    }
    this.tapped.clear();
    this.current = nextSnapshot(this.previousHeld, held, moveX, moveY);
    this.previousHeld = held;
    return this.current;
  }

  /** Test / attract-mode hook: hold or release an action programmatically. */
  setScripted(action: Action, isHeld: boolean): void {
    if (isHeld) {
      this.scripted.add(action);
    } else {
      this.scripted.delete(action);
    }
  }

  /** True if any key or pad button went down this frame (menus, "press start"). */
  anyPressed(): boolean {
    return ACTIONS.some((a) => this.current.pressed[a]);
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | undefined {
    const gamepads = this.scene.input.gamepad;
    if (!gamepads || gamepads.total === 0) {
      return undefined;
    }
    return gamepads.getPad(this.padIndex) ?? undefined;
  }

  private isBound(code: string): boolean {
    return ACTIONS.some((a) => this.bindings.keys[a].includes(code));
  }

  private destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
}
