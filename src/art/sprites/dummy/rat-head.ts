/**
 * The training dummy's head: a stuffed sewer rat in a yellow hard hat. Shared
 * by the dummy sprite and the head that pops off when it's knocked out.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { shade } from "../../pixel/paint";
import { type PixelCanvas, outlinedLayer } from "../../pixel/pixel-canvas";
import { fillCircle, fillEllipse, fillPolygon, fillRect, line } from "../../pixel/shapes";

export type DummyEyes = "button" | "x" | "wide";

const furPaint = shade(RAMPS.ratFur, { bias: 0.15 });
const hatPaint = shade(RAMPS.gold, { bias: 0.1 });

/** Draws the head centred on (cx, cy), facing left (towards a player approaching from the left). */
export function drawRatHead(c: PixelCanvas, cx: number, cy: number, eyes: DummyEyes): void {
  outlinedLayer(c, OUTLINE, (l) => {
    fillCircle(l, cx + 4, cy - 4, 2.6, furPaint); // ear
    fillEllipse(l, cx, cy, 5.5, 4.5, furPaint);
    fillPolygon(
      l,
      [
        [cx - 3, cy - 2],
        [cx - 9, cy + 1.5],
        [cx - 3, cy + 3.5],
      ],
      furPaint,
    ); // snout
  });
  fillCircle(c, cx + 4, cy - 4, 1.2, RAMPS.flesh[2]!);
  fillCircle(c, cx - 9, cy + 1.5, 1, RAMPS.flesh[2]!); // nose
  line(c, cx - 7, cy + 2, cx - 10, cy + 4, RAMPS.ratFur[3]!); // whiskers
  line(c, cx - 7, cy + 1, cx - 11, cy + 1, RAMPS.ratFur[3]!);
  // Hard hat.
  outlinedLayer(c, OUTLINE, (l) => {
    fillEllipse(l, cx + 0.5, cy - 4, 5, 3.2, hatPaint);
    fillRect(l, cx - 6, cy - 3, 13, 1, hatPaint);
  });
  const ex = cx - 2;
  const ey = cy - 0.5;
  if (eyes === "x") {
    line(c, ex - 1, ey - 1, ex + 1, ey + 1, OUTLINE);
    line(c, ex - 1, ey + 1, ex + 1, ey - 1, OUTLINE);
  } else {
    const r = eyes === "wide" ? 2 : 1.4;
    fillCircle(c, ex, ey, r + 0.6, OUTLINE);
    fillCircle(c, ex, ey, r - 0.4, eyes === "wide" ? WHITE : RAMPS.shorts[1]!);
    c.plot(ex, ey, OUTLINE);
  }
  // Stitched mouth.
  line(c, cx - 5, cy + 3, cx - 1, cy + 3, OUTLINE);
  c.plot(cx - 4, cy + 4, OUTLINE);
  c.plot(cx - 2, cy + 4, OUTLINE);
}
