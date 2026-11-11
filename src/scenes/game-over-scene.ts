/**
 * Game over: Bulgo's puddle, a sad trombone, and back to the title.
 */
import * as Phaser from "phaser";
import { animationKey } from "../art/pixel/sprite-sheet";
import { applySheetOrigin } from "../art/texture-registry";
import { audio } from "../audio";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/display";
import { GameSession } from "../core/game-session";
import { PLAYER_ONE_BINDINGS } from "../core/input/bindings";
import { InputSource } from "../core/input/input-source";
import { pixelText } from "../ui/text";
import { SceneKeys } from "./scene-keys";

export class GameOverScene extends Phaser.Scene {
  private input1!: InputSource;
  private canLeaveAt = 0;

  constructor() {
    super(SceneKeys.GameOver);
  }

  create(): void {
    this.input1 = new InputSource(this, PLAYER_ONE_BINDINGS);
    this.canLeaveAt = this.time.now + 1500;
    audio.music.stop(0.3);
    audio.music.stinger("game_over");
    this.cameras.main.setBackgroundColor("#0b0614");
    pixelText(this, GAME_WIDTH / 2, 60, "GAME OVER", "pink", 4).setOrigin(0.5);
    pixelText(this, GAME_WIDTH / 2, 92, "BULGO HAS BECOME A PUDDLE.", "white").setOrigin(0.5);
    pixelText(
      this,
      GAME_WIDTH / 2,
      104,
      `FINAL SCORE ${GameSession.get(this.game).score}`,
      "gold",
    ).setOrigin(0.5);
    const puddle = this.add.sprite(GAME_WIDTH / 2, 160, "bulgo");
    applySheetOrigin(puddle, "bulgo");
    puddle.play(animationKey("bulgo", "death"));
    const prompt = pixelText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 24,
      "PRESS START",
      "slime",
    ).setOrigin(0.5);
    this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => prompt.setVisible(!prompt.visible),
    });
  }

  override update(time: number): void {
    this.input1.poll();
    if (time > this.canLeaveAt && this.input1.anyPressed()) {
      audio.sfx.play("menu_select");
      this.scene.start(SceneKeys.Title);
    }
  }
}
