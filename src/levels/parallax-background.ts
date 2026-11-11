/**
 * Screen-fixed tile sprites whose texture offset follows the camera at
 * different rates — the classic multi-layer 16-bit parallax.
 */
import type * as Phaser from "phaser";
import type { ParallaxLayerArt } from "../art/backgrounds/sewer-backgrounds";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/display";

export class ParallaxBackground {
  private readonly layers: { sprite: Phaser.GameObjects.TileSprite; factor: number }[];

  constructor(
    private readonly scene: Phaser.Scene,
    art: readonly ParallaxLayerArt[],
  ) {
    this.layers = art.map((layer, i) => ({
      sprite: scene.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, layer.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10 + i),
      factor: layer.scrollFactor,
    }));
  }

  update(): void {
    const cam = this.scene.cameras.main;
    for (const { sprite, factor } of this.layers) {
      sprite.tilePositionX = Math.round(cam.scrollX * factor);
      // A touch of vertical parallax so tall stages feel deep.
      sprite.tilePositionY = Math.round(cam.scrollY * factor * 0.25);
    }
  }
}
