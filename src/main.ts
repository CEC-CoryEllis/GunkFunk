/**
 * Game entry point: Phaser configuration and scene list.
 */
import * as Phaser from "phaser";
import { BACKGROUND_COLOR, DEBUG, GAME_HEIGHT, GAME_WIDTH, PHYSICS_FPS } from "./config/display";
import { BootScene } from "./scenes/boot-scene";
import { GameOverScene } from "./scenes/game-over-scene";
import { StageClearScene } from "./scenes/stage-clear-scene";
import { HudScene } from "./scenes/hud-scene";
import { LevelScene } from "./scenes/level-scene";
import { PauseScene } from "./scenes/pause-scene";
import { TitleScene } from "./scenes/title-scene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { gamepad: true, keyboard: false },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      fps: PHYSICS_FPS,
      fixedStep: true,
      tileBias: 20,
      debug: DEBUG,
    },
  },
  scene: [BootScene, TitleScene, LevelScene, HudScene, PauseScene, GameOverScene, StageClearScene],
});

if (DEBUG) {
  (window as unknown as { gunkGame: Phaser.Game }).gunkGame = game;
}
