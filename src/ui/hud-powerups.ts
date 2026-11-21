/**
 * HUD timers for running power-ups: one icon per power-up with a draining
 * bar underneath that blinks in the last couple of seconds.
 */
import type * as Phaser from "phaser";
import { POWERUP_ICON_SHEET_KEY } from "../art/sprites/powerups/powerup-sheet";
import { POWERUP_WARNING_SECONDS } from "../gameplay/powerups/powerup-definitions";
import { POWERUP_IDS } from "../gameplay/powerups/powerup-ids";
import type { ActivePowerUp } from "../gameplay/powerups/powerup-timers";

const SLOT = 22;
const BAR_W = 16;

export class HudPowerUps {
  private readonly icons: Phaser.GameObjects.Image[];
  private readonly bars: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
  ) {
    this.icons = POWERUP_IDS.map((_, i) =>
      scene.add
        .image(x + i * SLOT, y, POWERUP_ICON_SHEET_KEY, 0)
        .setOrigin(0, 0)
        .setVisible(false),
    );
    this.bars = scene.add.graphics();
  }

  set(active: readonly ActivePowerUp[], now: number): void {
    this.bars.clear();
    this.icons.forEach((icon, i) => {
      const powerUp = active[i];
      icon.setVisible(powerUp !== undefined);
      if (!powerUp) return;
      icon.setFrame(POWERUP_IDS.indexOf(powerUp.id));
      const warning = powerUp.remaining < POWERUP_WARNING_SECONDS;
      const blinkOff = warning && Math.floor(now / 120) % 2 === 0;
      icon.setAlpha(blinkOff ? 0.35 : 1);
      const bx = this.x + i * SLOT;
      const by = this.y + 18;
      const fill = Math.max(0, Math.round((powerUp.remaining / powerUp.duration) * BAR_W));
      this.bars.fillStyle(0x1a0d24).fillRect(bx - 1, by - 1, BAR_W + 2, 5);
      this.bars.fillStyle(0x2a1450).fillRect(bx, by, BAR_W, 3);
      this.bars.fillStyle(warning ? 0xff5050 : 0xf0b400).fillRect(bx, by, fill, 3);
    });
  }
}
