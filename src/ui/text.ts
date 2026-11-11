/**
 * Pixel-font text helpers. The font only has uppercase glyphs, so text is
 * upper-cased here rather than at every call site.
 */
import type * as Phaser from "phaser";
import { type FontStyle, fontTextureKey } from "../art/fonts/pixel-font";

export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: FontStyle = "white",
  scale = 1,
): Phaser.GameObjects.BitmapText {
  return scene.add.bitmapText(x, y, fontTextureKey(style), text.toUpperCase()).setScale(scale);
}

export function setPixelText(label: Phaser.GameObjects.BitmapText, text: string): void {
  label.setText(text.toUpperCase());
}
