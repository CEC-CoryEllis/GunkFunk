/**
 * Boot-time bridge between the pure raster pipeline and Phaser: rasterises
 * every sheet, tileset, background and font into Phaser textures and
 * registers animations. Runs once in BootScene.
 */
import * as Phaser from "phaser";
import { type ParallaxLayerArt, sewerParallaxLayers } from "./backgrounds/sewer-backgrounds";
import {
  FONT_CELL_HEIGHT,
  FONT_CELL_WIDTH,
  FONT_CHARS_PER_ROW,
  type FontStyle,
  buildFontCanvas,
  fontTextureKey,
} from "./fonts/pixel-font";
import { FONT_CHARS } from "./fonts/glyphs-5x7";
import type { PixelCanvas } from "./pixel/pixel-canvas";
import { type BuiltSheet, type FrameAnchors, buildSheet } from "./pixel/sprite-sheet";
import { spriteCatalog } from "./sprite-catalog";
import { bulgoPortrait } from "./sprites/bulgo/bulgo-sheet";
import { PARTICLE_SIZE, PARTICLE_TEXTURE, buildParticleSheet } from "./sprites/fx/particle-sheet";
import { buildSewerTileset } from "./tiles/sewer-tileset";

export interface SheetInfo {
  frameWidth: number;
  frameHeight: number;
  originX: number;
  originY: number;
}

const sheetInfo = new Map<string, SheetInfo>();
const sheetAnchors = new Map<string, (FrameAnchors | undefined)[]>();
let parallaxLayers: ParallaxLayerArt[] = [];

export const TILESET_KEYS = { sewer: "tiles-sewer" } as const;
export const PORTRAIT_KEYS = { bulgo: "portrait-bulgo" } as const;

function toCanvasElement(pixels: PixelCanvas): HTMLCanvasElement {
  const element = document.createElement("canvas");
  element.width = pixels.width;
  element.height = pixels.height;
  const ctx = element.getContext("2d")!;
  ctx.putImageData(new ImageData(pixels.bytes, pixels.width, pixels.height), 0, 0);
  return element;
}

function registerSheet(scene: Phaser.Scene, sheet: BuiltSheet): void {
  const texture = scene.textures.addCanvas(sheet.key, toCanvasElement(sheet.canvas))!;
  const columns = sheet.canvas.width / sheet.frameWidth;
  for (let i = 0; i < sheet.frameCount; i++) {
    const frame = texture.add(
      i,
      0,
      (i % columns) * sheet.frameWidth,
      Math.floor(i / columns) * sheet.frameHeight,
      sheet.frameWidth,
      sheet.frameHeight,
    )!;
    // A custom pivot makes Phaser mirror flipped sprites around the authored
    // origin (between the feet / at the grip). Without it Phaser mirrors around
    // the frame's centre, which shifts every left-facing sprite off its body.
    frame.customPivot = true;
    frame.pivotX = sheet.originX / sheet.frameWidth;
    frame.pivotY = sheet.originY / sheet.frameHeight;
  }
  for (const anim of sheet.animations) {
    scene.anims.create({
      key: anim.key,
      frames: anim.frames.map((frame, i) => ({
        key: sheet.key,
        frame,
        duration: anim.holds[i] ?? 0,
      })),
      frameRate: anim.frameRate,
      repeat: anim.repeat,
      yoyo: anim.yoyo,
    });
  }
  sheetAnchors.set(sheet.key, sheet.frameAnchors);
  sheetInfo.set(sheet.key, {
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight,
    originX: sheet.originX,
    originY: sheet.originY,
  });
}

function registerFont(scene: Phaser.Scene, style: FontStyle): void {
  const key = fontTextureKey(style);
  scene.textures.addCanvas(key, toCanvasElement(buildFontCanvas(style)));
  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: key,
    width: FONT_CELL_WIDTH,
    height: FONT_CELL_HEIGHT,
    chars: FONT_CHARS,
    charsPerRow: FONT_CHARS_PER_ROW,
    "offset.x": 0,
    "offset.y": 0,
    "spacing.x": 0,
    "spacing.y": 0,
    lineSpacing: 2,
  });
  scene.cache.bitmapFont.add(key, data);
}

function registerParticles(scene: Phaser.Scene): void {
  const { canvas, frames } = buildParticleSheet();
  const texture = scene.textures.addCanvas(PARTICLE_TEXTURE, toCanvasElement(canvas))!;
  for (const [name, x] of frames) texture.add(name, 0, x, 0, PARTICLE_SIZE, PARTICLE_SIZE);
}

export function registerAllArt(scene: Phaser.Scene): void {
  for (const spec of spriteCatalog()) {
    registerSheet(scene, buildSheet(spec));
  }
  scene.textures.addCanvas(TILESET_KEYS.sewer, toCanvasElement(buildSewerTileset()));
  scene.textures.addCanvas(PORTRAIT_KEYS.bulgo, toCanvasElement(bulgoPortrait()));
  registerParticles(scene);
  parallaxLayers = sewerParallaxLayers();
  for (const layer of parallaxLayers) {
    scene.textures.addCanvas(layer.key, toCanvasElement(layer.canvas));
  }
  for (const style of ["white", "gold", "slime", "pink"] as const) {
    registerFont(scene, style);
  }
}

export function getSheetInfo(key: string): SheetInfo {
  const info = sheetInfo.get(key);
  if (!info) throw new Error(`Sprite sheet "${key}" was not registered`);
  return info;
}

/** Sets a sprite's origin to the sheet's authored anchor (between the feet for characters). */
export function applySheetOrigin(sprite: Phaser.GameObjects.Sprite, key: string): void {
  const info = getSheetInfo(key);
  sprite.setOrigin(info.originX / info.frameWidth, info.originY / info.frameHeight);
}

/** An anchor point (relative to the origin, facing right) for a frame, if the sheet defines one. */
export function getFrameAnchor(
  key: string,
  frameIndex: number,
  name: string,
): { x: number; y: number } | undefined {
  return sheetAnchors.get(key)?.[frameIndex]?.[name];
}

export function getParallaxLayers(): readonly ParallaxLayerArt[] {
  return parallaxLayers;
}
