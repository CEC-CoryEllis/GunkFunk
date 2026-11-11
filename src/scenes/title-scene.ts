/**
 * Title screen: bouncing logo, dancing Bulgo, scrolling sewer, "PRESS START".
 * The first key press also unlocks browser audio and kicks off the theme.
 * (Full animated title with attract mode is milestone M10.)
 */
import * as Phaser from "phaser";
import { animationKey } from "../art/pixel/sprite-sheet";
import { applySheetOrigin, getParallaxLayers } from "../art/texture-registry";
import { audio } from "../audio";
import { CONTROL_HINTS, PLAYER_ONE_BINDINGS } from "../core/input/bindings";
import { GameSession } from "../core/game-session";
import { InputSource } from "../core/input/input-source";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/display";
import { FIRST_LEVEL_ID } from "../levels/level-registry";
import { Menu } from "../ui/menu";
import { pixelText } from "../ui/text";
import { type LevelSceneData, SceneKeys } from "./scene-keys";

const LOGO = "GUNK FUNK";

export class TitleScene extends Phaser.Scene {
  private input1!: InputSource;
  private letters: Phaser.GameObjects.BitmapText[] = [];
  private backgrounds: Phaser.GameObjects.TileSprite[] = [];
  private pressStart!: Phaser.GameObjects.BitmapText;
  private menu?: Menu;
  private controlsPanel?: Phaser.GameObjects.Container;

  constructor() {
    super(SceneKeys.Title);
  }

  create(): void {
    this.input1 = new InputSource(this, PLAYER_ONE_BINDINGS);
    this.menu = undefined;
    this.backgrounds = getParallaxLayers().map((layer, i) =>
      this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, layer.key).setOrigin(0, 0).setDepth(i),
    );
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0614, 0.35).setOrigin(0, 0).setDepth(5);

    const scale = 4;
    const glyph = 8 * scale - 4;
    const startX = GAME_WIDTH / 2 - ((LOGO.length - 1) * glyph) / 2;
    this.letters = [...LOGO].map((ch, i) =>
      pixelText(this, Math.round(startX + i * glyph), 40, ch, i < 4 ? "slime" : "gold", scale)
        .setOrigin(0.5)
        .setDepth(10),
    );
    pixelText(this, GAME_WIDTH / 2, 70, "THE GROOVIEST GROSS-OUT OF 1994!", "pink")
      .setOrigin(0.5)
      .setDepth(10);

    const bulgo = this.add.sprite(GAME_WIDTH / 2, 168, "bulgo").setDepth(10);
    applySheetOrigin(bulgo, "bulgo");
    bulgo.play({ key: animationKey("bulgo", "victory"), repeat: -1 });

    this.pressStart = pixelText(this, GAME_WIDTH / 2, 182, "PRESS START", "white")
      .setOrigin(0.5)
      .setDepth(10);
    // A click or tap also counts as "press start" (and focuses an embedded page for the keyboard).
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.menu) this.openMenu();
    });
    pixelText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 10,
      "(C) 1994 STINKWARE LTD.  NOT REALLY.",
      "white",
    )
      .setOrigin(0.5)
      .setAlpha(0.6)
      .setDepth(10);
  }

  override update(time: number, delta: number): void {
    this.input1.poll();
    this.letters.forEach((letter, i) => {
      letter.y = 40 + Math.round(Math.sin(time / 220 + i * 0.6) * 4);
    });
    this.backgrounds.forEach((bg, i) => {
      bg.tilePositionX += (delta / 1000) * (6 + i * 14);
    });
    this.pressStart.setVisible(Math.floor(time / 450) % 2 === 0 && !this.menu);

    if (this.controlsPanel) {
      if (this.input1.anyPressed()) {
        audio.sfx.play("menu_back");
        this.controlsPanel.destroy();
        this.controlsPanel = undefined;
        this.menu?.setEnabled(true);
      }
      return;
    }
    if (!this.menu) {
      if (this.input1.anyPressed()) this.openMenu();
    } else {
      this.menu.update(this.input1, time);
    }
  }

  private openMenu(): void {
    void audio.unlock().then(() => audio.music.play("title"));
    audio.sfx.play("menu_select");
    this.menu = new Menu(
      this,
      [
        { label: "START GAME", action: () => this.startGame() },
        { label: "CONTROLS", action: () => this.showControls() },
      ],
      GAME_WIDTH / 2,
      176,
    );
  }

  private showControls(): void {
    this.menu?.setEnabled(false);
    const lines = CONTROL_HINTS.map(([action, keys]) => `${action.padEnd(14, " ")}${keys}`);
    const bg = this.add
      .rectangle(0, 0, 260, 22 + lines.length * 12, 0x120822, 0.95)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x7a52c8);
    const title = pixelText(this, 0, 6, "CONTROLS", "gold").setOrigin(0.5, 0);
    const texts = lines.map((line, i) => pixelText(this, -118, 20 + i * 12, line));
    this.controlsPanel = this.add
      .container(GAME_WIDTH / 2, 50, [bg, title, ...texts])
      .setDepth(600);
  }

  private startGame(): void {
    this.menu?.setEnabled(false);
    GameSession.reset(this.game);
    this.cameras.main.flash(250, 255, 255, 255);
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: LevelSceneData = { levelId: FIRST_LEVEL_ID };
      this.scene.start(SceneKeys.Level, data);
    });
  }
}
