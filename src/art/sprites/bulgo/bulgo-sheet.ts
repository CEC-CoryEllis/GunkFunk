/**
 * Assembles Bulgo's sprite sheet spec from his animation pose lists.
 */
import { PixelCanvas } from "../../pixel/pixel-canvas";
import type { AnimationSpec, SheetSpec } from "../../pixel/sprite-sheet";
import { BULGO_ANIMATIONS } from "./animations";
import { pose } from "./bulgo-pose";
import { BULGO_FRAME, drawBulgo } from "./bulgo-rig";

export const BULGO_SHEET_KEY = "bulgo";

export function bulgoSheetSpec(): SheetSpec {
  const animations: AnimationSpec[] = BULGO_ANIMATIONS.map((anim) => ({
    name: anim.name,
    frameRate: anim.frameRate,
    repeat: anim.repeat,
    holds: anim.holds,
    frames: anim.poses.map((p) => (canvas) => drawBulgo(canvas, p)),
  }));
  return {
    key: BULGO_SHEET_KEY,
    frameWidth: BULGO_FRAME.width,
    frameHeight: BULGO_FRAME.height,
    originX: BULGO_FRAME.originX,
    originY: BULGO_FRAME.originY,
    animations,
  };
}

/** HUD / menu portrait: Bulgo's head cropped from a grinning pose. */
export function bulgoPortrait(): PixelCanvas {
  const full = new PixelCanvas(BULGO_FRAME.width, BULGO_FRAME.height);
  drawBulgo(full, pose({ mouth: "grin", eyes: "open", frontArm: { a1: 0.1, a2: 0 } }));
  const portrait = new PixelCanvas(26, 24);
  for (let y = 0; y < portrait.height; y++) {
    for (let x = 0; x < portrait.width; x++) {
      portrait.set(x, y, full.get(x + 19, y + 3));
    }
  }
  return portrait;
}
