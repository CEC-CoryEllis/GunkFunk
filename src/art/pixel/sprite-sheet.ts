/**
 * Packs frame-drawing functions into one sprite sheet canvas and records the
 * animation metadata needed to register Phaser animations.
 */
import { PixelCanvas } from "./pixel-canvas";

export type FrameDrawer = (canvas: PixelCanvas) => void;

export interface AnimationSpec {
  name: string;
  frames: readonly FrameDrawer[];
  frameRate: number;
  /** -1 loops forever, 0 plays once. */
  repeat: number;
  /** Optional extra milliseconds per frame (holds for anticipation / impact frames). */
  holds?: readonly number[];
  /** Frames to play after the last one when looping back (yoyo-style) — rarely needed. */
  yoyo?: boolean;
}

export interface SheetSpec {
  key: string;
  frameWidth: number;
  frameHeight: number;
  /** Pixel inside a frame that sits on the entity's position (usually between the feet). */
  originX: number;
  originY: number;
  animations: readonly AnimationSpec[];
}

export interface BuiltAnimation {
  /** Globally unique Phaser animation key: `${sheetKey}:${name}`. */
  key: string;
  name: string;
  frames: number[];
  frameRate: number;
  repeat: number;
  holds: readonly number[];
  yoyo: boolean;
}

export interface BuiltSheet {
  key: string;
  frameWidth: number;
  frameHeight: number;
  originX: number;
  originY: number;
  frameCount: number;
  canvas: PixelCanvas;
  animations: BuiltAnimation[];
}

const SHEET_COLUMNS = 16;

export function animationKey(sheetKey: string, name: string): string {
  return `${sheetKey}:${name}`;
}

export function buildSheet(spec: SheetSpec): BuiltSheet {
  const frameCanvases: PixelCanvas[] = [];
  const animations: BuiltAnimation[] = [];

  for (const anim of spec.animations) {
    const start = frameCanvases.length;
    for (const draw of anim.frames) {
      const frame = new PixelCanvas(spec.frameWidth, spec.frameHeight);
      draw(frame);
      frameCanvases.push(frame);
    }
    animations.push({
      key: animationKey(spec.key, anim.name),
      name: anim.name,
      frames: anim.frames.map((_, i) => start + i),
      frameRate: anim.frameRate,
      repeat: anim.repeat,
      holds: anim.holds ?? [],
      yoyo: anim.yoyo ?? false,
    });
  }

  const columns = Math.min(SHEET_COLUMNS, Math.max(1, frameCanvases.length));
  const rows = Math.ceil(frameCanvases.length / columns);
  const canvas = new PixelCanvas(columns * spec.frameWidth, Math.max(1, rows) * spec.frameHeight);
  frameCanvases.forEach((frame, i) => {
    canvas.draw(frame, (i % columns) * spec.frameWidth, Math.floor(i / columns) * spec.frameHeight);
  });

  return {
    key: spec.key,
    frameWidth: spec.frameWidth,
    frameHeight: spec.frameHeight,
    originX: spec.originX,
    originY: spec.originY,
    frameCount: frameCanvases.length,
    canvas,
    animations,
  };
}

/** Repeats each drawer `times` times — a cheap way to hold poses inside a looping animation. */
export function hold(drawer: FrameDrawer, times: number): FrameDrawer[] {
  return Array.from({ length: times }, () => drawer);
}
