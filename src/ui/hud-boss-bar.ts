/**
 * The boss health bar along the bottom of the screen: the boss's name over a
 * long bar that drains (with a trailing "damage" segment) as it takes hits.
 */
import type * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/display";
import type { BossStatus } from "../gameplay/bosses/boss";
import { pixelText, setPixelText } from "./text";

const BAR_W = 200;
const BAR_H = 6;
/** How fast the pale "damage taken" segment catches up, in bar fractions per second. */
const TRAIL_SPEED = 0.6;

export class HudBossBar {
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.BitmapText;
  private trail = 1;
  private shownName = "";

  constructor(scene: Phaser.Scene) {
    this.bar = scene.add.graphics();
    this.label = pixelText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 22, "", "pink").setOrigin(0.5, 0);
  }

  set(status: BossStatus | null, dt: number): void {
    this.bar.clear();
    this.label.setVisible(status !== null);
    if (!status) {
      this.trail = 1;
      return;
    }
    if (status.name !== this.shownName) {
      this.shownName = status.name;
      setPixelText(this.label, status.name);
    }
    const fraction = Math.max(0, status.health / status.maxHealth);
    this.trail = Math.max(fraction, this.trail - TRAIL_SPEED * dt);
    const x = (GAME_WIDTH - BAR_W) / 2;
    const y = GAME_HEIGHT - 11;
    this.bar.fillStyle(0x1a0d24).fillRect(x - 2, y - 2, BAR_W + 4, BAR_H + 4);
    this.bar.fillStyle(0x2a1450).fillRect(x, y, BAR_W, BAR_H);
    this.bar.fillStyle(0xff9ee8).fillRect(x, y, Math.round(BAR_W * this.trail), BAR_H);
    this.bar.fillStyle(0xc8300c).fillRect(x, y, Math.round(BAR_W * fraction), BAR_H);
    this.bar.fillStyle(0xff8a1a).fillRect(x, y, Math.round(BAR_W * fraction), 2);
  }
}
