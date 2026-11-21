/**
 * 16×16 weapon icons, shared by the HUD weapon box and the floating pickups.
 */
import type { WeaponId } from "../../../gameplay/weapons/weapon-ids";
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import {
  fillCapsule,
  fillCircle,
  fillEllipse,
  fillPolygon,
  fillRect,
  line,
} from "../../pixel/shapes";

const sockPaint = shade(RAMPS.eyeWhite, { bias: 0.2 });
const nosePaint = shade(RAMPS.flesh, { bias: 0.15 });
const slimePaint = shade(RAMPS.sludge, { bias: 0.1 });
const chickenPaint = shade(RAMPS.gold, { bias: 0.15 });

/** A striped tube sock, leg up and foot kicked right. */
export function drawSockIcon(c: PixelCanvas, ox: number, oy: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillCapsule(l, ox + 6, oy + 2, ox + 6, oy + 10, 3, sockPaint);
    fillCapsule(l, ox + 6, oy + 11, ox + 12, oy + 12, 2.6, sockPaint);
  });
  fillRect(c, ox + 4, oy + 2, 5, 1, RAMPS.shorts[2]!);
  fillRect(c, ox + 4, oy + 4, 5, 1, RAMPS.iris[2]!);
  fillRect(c, ox + 11, oy + 11, 2, 2, RAMPS.eyeWhite[0]!); // grubby toe
}

/** A big pink nose with a green drip — the Snot Blaster. */
export function drawSnotIcon(c: PixelCanvas, ox: number, oy: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, ox + 8, oy + 7, 5.5, 5, nosePaint);
    fillCapsule(l, ox + 10, oy + 11, ox + 10, oy + 14, 1.6, slimePaint);
  });
  fillEllipse(c, ox + 6, oy + 9, 1.4, 1, RAMPS.flesh[0]!);
  fillEllipse(c, ox + 10, oy + 9, 1.4, 1, RAMPS.flesh[0]!);
  c.plot(ox + 6, oy + 4, WHITE);
}

/** A rubber chicken mid-squawk. */
export function drawChickenIcon(c: PixelCanvas, ox: number, oy: number): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, ox + 7, oy + 10, 5, 3.5, chickenPaint);
    fillCapsule(l, ox + 10, oy + 8, ox + 11, oy + 4, 1.8, chickenPaint);
    fillPolygon(
      l,
      [
        [ox + 12, oy + 3],
        [ox + 15.5, oy + 4.5],
        [ox + 12, oy + 6],
      ],
      RAMPS.fire[2]!,
    );
    fillCircle(l, ox + 10.5, oy + 1.8, 1.5, RAMPS.fire[1]!);
  });
  c.plot(ox + 11, oy + 4, OUTLINE);
  line(c, ox + 5, oy + 13, ox + 4, oy + 15, RAMPS.fire[2]!);
  line(c, ox + 8, oy + 13, ox + 8, oy + 15, RAMPS.fire[2]!);
}

export function drawWeaponIcon(c: PixelCanvas, id: WeaponId, ox: number, oy: number): void {
  if (id === "sock") drawSockIcon(c, ox, oy);
  else if (id === "snot") drawSnotIcon(c, ox, oy);
  else drawChickenIcon(c, ox, oy);
}
