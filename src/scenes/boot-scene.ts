/**
 * Rasterises all generated art into Phaser textures, then hands off to the
 * title screen. There are no files to download, so this takes milliseconds.
 */
import * as Phaser from "phaser";
import { registerAllArt } from "../art/texture-registry";
import { SceneKeys } from "./scene-keys";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    registerAllArt(this);
    this.scene.start(SceneKeys.Title);
  }
}
