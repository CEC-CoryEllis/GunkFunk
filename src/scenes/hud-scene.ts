/**
 * Heads-up display overlay: portrait, segmented "gut meter" health bar, lives
 * and score. Listens to game events; holds no gameplay references.
 */
import * as Phaser from "phaser";
import { PORTRAIT_KEYS } from "../art/texture-registry";
import { GAME_WIDTH } from "../config/display";
import { GameEvents, type HealthChangedPayload, PLAYER_HEALTH_KEY } from "../core/game-events";
import { GameSession } from "../core/game-session";
import { pixelText, setPixelText } from "../ui/text";
import { SceneKeys } from "./scene-keys";

const SEGMENT_W = 9;
const SEGMENT_H = 6;

export class HudScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;
  private lives!: Phaser.GameObjects.BitmapText;
  private score!: Phaser.GameObjects.BitmapText;
  private health: HealthChangedPayload = { health: 0, maxHealth: 0 };
  private displayedScore = 0;

  constructor() {
    super(SceneKeys.Hud);
  }

  create(): void {
    const session = GameSession.get(this.game);
    this.add.image(4, 3, PORTRAIT_KEYS.bulgo).setOrigin(0, 0);
    pixelText(this, 32, 3, "BULGO", "slime");
    this.bar = this.add.graphics();
    this.lives = pixelText(this, 32, 21, `x${session.lives}`, "white");
    pixelText(this, GAME_WIDTH - 4, 3, "SCORE", "pink").setOrigin(1, 0);
    this.score = pixelText(this, GAME_WIDTH - 4, 13, "000000", "gold").setOrigin(1, 0);
    this.displayedScore = session.score;
    const initial = this.registry.get(PLAYER_HEALTH_KEY) as HealthChangedPayload | undefined;
    if (initial) {
      this.health = initial;
      this.drawHealth();
    }

    const events = this.game.events;
    const onHealth = (payload: HealthChangedPayload) => {
      const lost = payload.health < this.health.health;
      this.health = payload;
      this.drawHealth();
      if (lost) this.cameras.main.shake(120, 0.004);
    };
    const onLives = (lives: number) => setPixelText(this.lives, `x${lives}`);
    events.on(GameEvents.HealthChanged, onHealth);
    events.on(GameEvents.LivesChanged, onLives);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.off(GameEvents.HealthChanged, onHealth);
      events.off(GameEvents.LivesChanged, onLives);
    });
  }

  override update(): void {
    // Score counts up arcade-style instead of jumping.
    const target = GameSession.get(this.game).score;
    if (this.displayedScore !== target) {
      this.displayedScore += Math.max(1, Math.ceil((target - this.displayedScore) / 8));
      if (this.displayedScore > target) this.displayedScore = target;
      setPixelText(this.score, String(this.displayedScore).padStart(6, "0"));
    }
  }

  private drawHealth(): void {
    const g = this.bar.clear();
    const x0 = 32;
    const y0 = 13;
    for (let i = 0; i < this.health.maxHealth; i++) {
      const x = x0 + i * (SEGMENT_W + 1);
      g.fillStyle(0x1a0d24).fillRect(x - 1, y0 - 1, SEGMENT_W + 2, SEGMENT_H + 2);
      if (i < this.health.health) {
        const low = this.health.health <= 2;
        g.fillStyle(low ? 0xc8300c : 0x3a9a14).fillRect(x, y0, SEGMENT_W, SEGMENT_H);
        g.fillStyle(low ? 0xff8a1a : 0x7bd81e).fillRect(x, y0, SEGMENT_W, 2);
        g.fillStyle(0xd4ff5a).fillRect(x + 1, y0, 2, 1);
      } else {
        g.fillStyle(0x2a1450).fillRect(x, y0, SEGMENT_W, SEGMENT_H);
      }
    }
  }
}
