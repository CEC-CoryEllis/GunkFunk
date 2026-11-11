/**
 * Comic speech bubbles for character quips, with gibberish "voice" blabber
 * synced to the text length.
 */
import * as Phaser from "phaser";
import { toPhaserColor } from "../art/pixel/color";
import { OUTLINE } from "../art/palettes";
import { audio } from "../audio";
import { pixelText } from "./text";

const PADDING = 4;
const MAX_CHARS_PER_LINE = 18;

function wrap(text: string): string {
  const words = text.toUpperCase().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + word.length + 1 > MAX_CHARS_PER_LINE) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export class SpeechBubble {
  private container?: Phaser.GameObjects.Container;
  private timer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene) {}

  get visible(): boolean {
    return this.container !== undefined;
  }

  say(text: string, voicePitch: number): void {
    this.hide();
    // White glyphs tinted to dark ink read best on the cream bubble.
    const label = pixelText(this.scene, PADDING, PADDING, wrap(text), "white").setTint(0x2a1640);
    const w = Math.ceil(label.width) + PADDING * 2;
    const h = Math.ceil(label.height) + PADDING * 2 - 2;
    const g = this.scene.add.graphics();
    g.fillStyle(toPhaserColor(OUTLINE));
    g.fillRect(-1, 0, w + 2, h);
    g.fillRect(0, -1, w, h + 2);
    g.fillStyle(0xfff8e8);
    g.fillRect(0, 0, w, h);
    // Tail pointing down-left at the speaker's head.
    g.fillStyle(toPhaserColor(OUTLINE));
    g.fillTriangle(6, h - 1, 14, h - 1, 5, h + 6);
    g.fillStyle(0xfff8e8);
    g.fillTriangle(8, h - 1, 12, h - 1, 7, h + 3);
    this.container = this.scene.add.container(0, 0, [g, label]).setDepth(200);
    this.container.setData("size", { w, h });

    const syllables = Math.min(8, Math.ceil(text.length / 4));
    for (let i = 0; i < syllables; i++) {
      this.scene.time.delayedCall(i * 75, () =>
        audio.sfx.play("blabber", {
          pitch: voicePitch * (0.9 + Math.random() * 0.25),
          volume: 0.7,
        }),
      );
    }
    this.timer = this.scene.time.delayedCall(1100 + text.length * 45, () => this.hide());
  }

  /** Keeps the bubble above the speaker's head and inside the camera view. */
  follow(x: number, headY: number): void {
    if (!this.container) return;
    const { w, h } = this.container.getData("size") as { w: number; h: number };
    const cam = this.scene.cameras.main;
    const bx = Phaser.Math.Clamp(
      Math.round(x - 6),
      cam.scrollX + 2,
      cam.scrollX + cam.width - w - 2,
    );
    const by = Math.max(cam.scrollY + 2, Math.round(headY - h - 8));
    this.container.setPosition(bx, by);
  }

  hide(): void {
    this.timer?.remove();
    this.container?.destroy();
    this.container = undefined;
  }
}
