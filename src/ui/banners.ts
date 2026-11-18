/**
 * Slide-in announcement banners: the stage intro card and the "you got a
 * weapon" banner.
 */
import type * as Phaser from "phaser";
import { GAME_WIDTH } from "../config/display";
import { pixelText } from "./text";

interface BannerOptions {
  y: number;
  holdMs: number;
  topStyle: "slime" | "pink";
}

/** The banner currently on screen per scene; a new one replaces it instead of stacking. */
const activeBanners = new WeakMap<Phaser.Scene, Phaser.GameObjects.GameObject[]>();

function slideBanner(scene: Phaser.Scene, top: string, main: string, options: BannerOptions): void {
  const { y, holdMs, topStyle } = options;
  const previous = activeBanners.get(scene);
  if (previous) {
    scene.tweens.killTweensOf(previous);
    for (const part of previous) part.destroy();
  }
  const upper = pixelText(scene, GAME_WIDTH / 2, y - 12, top, topStyle).setOrigin(0.5);
  const lower = pixelText(scene, GAME_WIDTH / 2, y + 2, main, "gold").setOrigin(0.5);
  const bar = scene.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH, 34, 0x0b0614, 0.8);
  const parts = [bar, upper, lower];
  activeBanners.set(scene, parts);
  parts.forEach((part, i) => part.setScrollFactor(0).setDepth(899 + i));
  for (const part of parts) part.x -= GAME_WIDTH;
  scene.tweens.add({ targets: parts, x: `+=${GAME_WIDTH}`, duration: 350, ease: "Back.Out" });
  scene.tweens.add({
    targets: parts,
    x: `+=${GAME_WIDTH}`,
    duration: 300,
    delay: holdMs,
    ease: "Back.In",
    onComplete: () => {
      parts.forEach((p) => p.destroy());
      if (activeBanners.get(scene) === parts) activeBanners.delete(scene);
    },
  });
}

export function showStageCard(scene: Phaser.Scene, title: string, subtitle: string): void {
  slideBanner(scene, subtitle, title, { y: 82, holdMs: 1900, topStyle: "slime" });
}

export function showPickupBanner(scene: Phaser.Scene, headline: string, detail: string): void {
  slideBanner(scene, headline, detail, { y: 62, holdMs: 1400, topStyle: "pink" });
}
