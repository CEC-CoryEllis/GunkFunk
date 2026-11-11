/**
 * Pause overlay: resume, restart the stage, or quit to the title.
 */
import * as Phaser from "phaser";
import { audio } from "../audio";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/display";
import { PLAYER_ONE_BINDINGS } from "../core/input/bindings";
import { InputSource } from "../core/input/input-source";
import { Menu } from "../ui/menu";
import { pixelText } from "../ui/text";
import { SceneKeys } from "./scene-keys";

export class PauseScene extends Phaser.Scene {
  private input1!: InputSource;
  private menu!: Menu;
  private title!: Phaser.GameObjects.BitmapText;
  private openedAt = 0;

  constructor() {
    super(SceneKeys.Pause);
  }

  create(): void {
    this.input1 = new InputSource(this, PLAYER_ONE_BINDINGS);
    this.openedAt = this.time.now;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0614, 0.7).setOrigin(0, 0);
    this.title = pixelText(this, GAME_WIDTH / 2, 70, "PAUSED", "gold", 3).setOrigin(0.5);
    pixelText(this, GAME_WIDTH / 2, 92, "BULGO TAKES A BREATHER", "pink").setOrigin(0.5);
    this.menu = new Menu(
      this,
      [
        { label: "RESUME", action: () => this.resume() },
        { label: "RESTART STAGE", action: () => this.restart() },
        { label: "QUIT TO TITLE", action: () => this.quit() },
      ],
      GAME_WIDTH / 2,
      116,
    );
  }

  override update(time: number): void {
    const input = this.input1.poll();
    this.title.y = 70 + Math.round(Math.sin(time / 200) * 2);
    // Ignore the press that opened the menu.
    if (time - this.openedAt < 150) return;
    if (input.pressed.pause && !input.pressed.jump) {
      this.resume();
      return;
    }
    this.menu.update(this.input1, time);
  }

  private resume(): void {
    audio.music.setMuffled(false);
    this.scene.stop();
    this.scene.resume(SceneKeys.Level);
  }

  private restart(): void {
    audio.music.setMuffled(false);
    const level = this.scene.get(SceneKeys.Level);
    const data = level.sys.settings.data;
    this.scene.stop(SceneKeys.Hud);
    this.scene.stop();
    level.scene.restart(data);
  }

  private quit(): void {
    audio.music.setMuffled(false);
    audio.music.stop(0.4);
    this.scene.stop(SceneKeys.Hud);
    this.scene.stop(SceneKeys.Level);
    this.scene.start(SceneKeys.Title);
  }
}
