/**
 * Small presentation helpers shared by every prop: creating a sheet-anchored
 * sprite, playing a named animation only when it changes, a white hit flash
 * and a quick squash-wobble.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { applySheetOrigin } from "../../art/texture-registry";

/** Props sit behind actors (enemies 16, player 20) and in front of tiles and sludge (10–12). */
export const PROP_DEPTH = 13;

export function addPropSprite(
  scene: Phaser.Scene,
  sheet: string,
  x: number,
  y: number,
  animation: string,
  depth = PROP_DEPTH,
): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(x, y, sheet).setDepth(depth);
  applySheetOrigin(sprite, sheet);
  sprite.play(animationKey(sheet, animation));
  return sprite;
}

export function playIfChanged(
  sprite: Phaser.GameObjects.Sprite,
  sheet: string,
  animation: string,
): void {
  const key = animationKey(sheet, animation);
  if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
}

export function flashWhite(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite): void {
  sprite.setTintFill(0xffffff);
  scene.time.delayedCall(50, () => {
    if (sprite.active) sprite.clearTint();
  });
}

/** Squash-and-stretch wobble when something gets whacked. */
export function wobble(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite): void {
  scene.tweens.killTweensOf(sprite);
  sprite.setScale(1.15, 0.85);
  scene.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 180, ease: "Back.Out" });
}
