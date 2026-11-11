/**
 * World 1 parallax layers, each a horizontally seamless strip:
 *   far  — gloomy arched tunnels fading into toxic-green haze
 *   mid  — giant rusty pipes with valves, flanges and dripping leaks
 *   near — brick pillars, grates and hanging slime
 * Layers are darkened toward the murk colour with distance (atmospheric
 * perspective) so the play field always reads in front.
 */
import { GAME_HEIGHT } from "../../config/display";
import { OUTLINE, RAMPS } from "../palettes";
import { type Color, type Ramp, mix } from "../pixel/color";
import { bayer, shade, verticalGradient } from "../pixel/paint";
import { PixelCanvas } from "../pixel/pixel-canvas";
import { fillCapsule, fillCircle, fillEllipse, fillRect } from "../pixel/shapes";

export const BACKGROUND_STRIP_WIDTH = 256;

export interface ParallaxLayerArt {
  key: string;
  canvas: PixelCanvas;
  /** Horizontal scroll speed relative to the camera (0 = fixed, 1 = moves with the world). */
  scrollFactor: number;
}

const HAZE = RAMPS.murk[1]!;

function fade(r: Ramp, amount: number): Ramp {
  return r.map((c) => mix(c, HAZE, amount));
}

function drawFar(): PixelCanvas {
  const c = new PixelCanvas(BACKGROUND_STRIP_WIDTH, GAME_HEIGHT);
  const sky = verticalGradient([RAMPS.murk[0]!, RAMPS.murk[1]!, RAMPS.murk[2]!], 0, GAME_HEIGHT);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) c.set(x, y, sky(x, y, 0, 0));
  // Repeating tunnel arches: dark openings with a sickly glow at the bottom.
  const archRamp = fade(RAMPS.sewerStone, 0.55);
  for (const ax of [0, 128, 256]) {
    fillEllipse(c, ax, 120, 54, 70, archRamp[1]!);
    fillEllipse(c, ax, 124, 44, 62, RAMPS.murk[0]!);
    for (let y = 150; y < 186; y++) {
      for (let x = ax - 44; x < ax + 44; x++) {
        const t = (y - 150) / 36;
        if (bayer(x, y) < t * 0.8 && c.get(x, y) === RAMPS.murk[0])
          c.set(x, y, mix(RAMPS.sludge[1]!, HAZE, 0.4));
      }
    }
  }
  fillRect(c, 0, 186, c.width, GAME_HEIGHT - 186, archRamp[0]!);
  return c;
}

function drawPipe(c: PixelCanvas, y: number, radius: number, ramp: Ramp): void {
  const paint = shade(ramp, { bias: -0.05, dither: 1.2 });
  fillRect(c, 0, y - radius - 1, c.width, 1, OUTLINE);
  fillRect(c, 0, y + radius + 1, c.width, 1, OUTLINE);
  for (let x = 0; x < c.width; x++) {
    for (let dy = -radius; dy <= radius; dy++)
      c.set(x, y + dy, paint(x, y + dy, 0, dy / (radius + 0.5)));
  }
  // Flanges every 64 px, bolts, and a leaky joint dripping goo.
  for (let fx = 20; fx < c.width; fx += 64) {
    fillRect(c, fx - 1, y - radius - 3, 6, radius * 2 + 7, OUTLINE);
    for (let dy = -radius - 2; dy <= radius + 2; dy++) {
      fillRect(c, fx, y + dy, 4, 1, paint(fx, y + dy, 0, dy / (radius + 2.5)));
    }
    c.set(fx + 1, y - radius, ramp[4] ?? ramp[3]!);
    c.set(fx + 1, y + radius, ramp[0]!);
  }
}

function drawMid(): PixelCanvas {
  const c = new PixelCanvas(BACKGROUND_STRIP_WIDTH, GAME_HEIGHT);
  const pipeRamp = fade(RAMPS.pipe, 0.45);
  drawPipe(c, 52, 7, pipeRamp);
  drawPipe(c, 150, 10, fade(RAMPS.metal, 0.5));
  // Vertical pipes plunging from the top, with valve wheels.
  for (const px of [70, 196]) {
    const ramp = fade(RAMPS.pipe, 0.5);
    fillRect(c, px - 7, 0, 14, 150, OUTLINE);
    for (let x = -6; x <= 6; x++) {
      const paint = shade(ramp, { dither: 1.2 });
      for (let y = 0; y < 148; y++) c.set(px + x, y, paint(px + x, y, x / 6.5, 0));
    }
    fillCircle(c, px, 96, 9, OUTLINE);
    fillCircle(c, px, 96, 8, fade(RAMPS.rust, 0.4)[1]!);
    fillCircle(c, px, 96, 5, OUTLINE);
    fillRect(c, px - 8, 95, 17, 2, fade(RAMPS.rust, 0.4)[2]!);
    // Leak.
    fillRect(c, px + 7, 120, 2, 28, fade(RAMPS.sludge, 0.35)[2]!);
  }
  return c;
}

function drawNear(): PixelCanvas {
  const height = GAME_HEIGHT;
  const c = new PixelCanvas(BACKGROUND_STRIP_WIDTH, height);
  const brick = fade(RAMPS.brick, 0.3);
  for (const px of [30, 158]) {
    // Pillar with an alternating brick pattern.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < 36; x++) {
        const row = Math.floor(y / 6);
        const mortar = y % 6 === 5 || (x + (row % 2) * 6) % 12 === 11;
        const edge = x < 2 ? 0 : x > 33 ? 1 : 2 + (x < 6 ? 1 : 0);
        c.set(px + x, y, mortar ? brick[0]! : brick[Math.min(edge, 3)]!);
      }
    }
    fillRect(c, px - 1, 0, 1, height, OUTLINE);
    fillRect(c, px + 36, 0, 1, height, OUTLINE);
    // A barred grate glowing faintly green.
    fillRect(c, px + 8, 60, 20, 26, OUTLINE);
    fillRect(c, px + 9, 61, 18, 24, mix(RAMPS.sludge[1]!, HAZE, 0.2));
    for (let gx = px + 11; gx < px + 27; gx += 4) fillRect(c, gx, 61, 2, 24, OUTLINE);
    // Slime strands hanging from the top.
    for (const [sx, len] of [
      [6, 26],
      [19, 40],
      [29, 16],
    ] as const) {
      const slime: Color = mix(RAMPS.sludge[2]!, HAZE, 0.25);
      fillCapsule(c, px + sx, 0, px + sx, len, 1.4, slime);
      fillCircle(c, px + sx, len + 1, 2, slime);
    }
  }
  return c;
}

export function sewerParallaxLayers(): ParallaxLayerArt[] {
  return [
    { key: "bg-sewer-far", canvas: drawFar(), scrollFactor: 0.08 },
    { key: "bg-sewer-mid", canvas: drawMid(), scrollFactor: 0.3 },
    { key: "bg-sewer-near", canvas: drawNear(), scrollFactor: 0.55 },
  ];
}
