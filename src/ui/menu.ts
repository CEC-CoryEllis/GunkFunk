/**
 * A vertical pixel-font menu with a bouncing cursor, driven by an
 * `InputSource`. Used by the title, pause and game-over screens.
 */
import type * as Phaser from "phaser";
import { audio } from "../audio";
import type { InputSource } from "../core/input/input-source";
import { pixelText } from "./text";

export interface MenuItem {
  label: string;
  action: () => void;
}

const LINE_HEIGHT = 13;

export class Menu {
  private index = 0;
  private readonly labels: Phaser.GameObjects.BitmapText[];
  private readonly cursor: Phaser.GameObjects.BitmapText;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly items: readonly MenuItem[],
    centerX: number,
    top: number,
  ) {
    this.labels = items.map((item, i) =>
      pixelText(scene, centerX, top + i * LINE_HEIGHT, item.label).setOrigin(0.5, 0),
    );
    this.cursor = pixelText(scene, 0, 0, ">", "gold");
    for (const obj of [...this.labels, this.cursor]) obj.setScrollFactor(0).setDepth(500);
    this.refresh();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  update(input: InputSource, time: number): void {
    if (!this.enabled) return;
    const s = input.snapshot;
    if (s.pressed.up || s.pressed.down) {
      this.index = (this.index + (s.pressed.down ? 1 : -1) + this.items.length) % this.items.length;
      audio.sfx.play("menu_move");
      this.refresh();
    }
    if (s.pressed.jump || s.pressed.attack || s.pressed.pause) {
      audio.sfx.play("menu_select");
      this.items[this.index]!.action();
    }
    const label = this.labels[this.index]!;
    this.cursor.setPosition(
      Math.round(label.x - label.width / 2 - 12 + Math.sin(time / 120) * 2),
      label.y,
    );
  }

  destroy(): void {
    for (const obj of [...this.labels, this.cursor]) obj.destroy();
  }

  private refresh(): void {
    this.labels.forEach((label, i) => label.setTint(i === this.index ? 0xffffff : 0x8a7fb0));
  }
}
