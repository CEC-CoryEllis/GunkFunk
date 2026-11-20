/**
 * Tiny 8×8 particle frames for Phaser particle emitters: feathers (exploding
 * chickens), stuffing (training dummies), sock lint, slime droplets, sparks.
 */
import { OUTLINE, RAMPS, WHITE } from "../../palettes";
import { PixelCanvas } from "../../pixel/pixel-canvas";
import { drawPixelMap } from "../../pixel/pixel-map";

export const PARTICLE_TEXTURE = "fx-particles";

export const PARTICLE_FRAMES = {
  feather: "feather",
  stuffing: "stuffing",
  lint: "lint",
  slime: "slime",
  spark: "spark",
  stink: "stink",
  splinter: "splinter",
  water: "water",
  junk: "junk",
  brick: "brick",
} as const;

const SIZE = 8;

const MAPS: Readonly<Record<keyof typeof PARTICLE_FRAMES, readonly string[]>> = {
  feather: [
    "......kk",
    "....kkwk",
    "...kwwk.",
    "..kwwyk.",
    ".kwwwk..",
    "kwwyk...",
    "kkk.....",
    "k.......",
  ],
  stuffing: [
    "........",
    "..kkk...",
    ".kwwwk..",
    "kwwgwwk.",
    "kwgwwwk.",
    ".kwwwk..",
    "..kkk...",
    "........",
  ],
  lint: [
    "........",
    "...p....",
    ".p.p.p..",
    "..ppp...",
    "pppppp..",
    "..ppp...",
    ".p.p.p..",
    "...p....",
  ],
  slime: [
    "........",
    "...k....",
    "..kgk...",
    ".kglgk..",
    ".kgggk..",
    ".kgdgk..",
    "..kkk...",
    "........",
  ],
  stink: [
    "........",
    "..dgg...",
    ".dgllg..",
    "dgglggd.",
    "dgggggd.",
    ".dgggd..",
    "..ddd...",
    "........",
  ],
  splinter: [
    "........",
    "......k.",
    ".....kbk",
    "....kbk.",
    "...kbk..",
    "..kbk...",
    ".kbk....",
    "..k.....",
  ],
  water: [
    "........",
    "...c....",
    "..cwc...",
    "..cwc...",
    ".ccwcc..",
    ".ccccc..",
    "..ccc...",
    "........",
  ],
  junk: [
    "........",
    ".kkk....",
    "kyyyk...",
    "kyyyyk..",
    ".kyyyyk.",
    "..kkyyk.",
    "....kk..",
    "........",
  ],
  brick: [
    "........",
    "..kkkk..",
    ".krrrrk.",
    ".krRrrk.",
    ".krrrRk.",
    "..kkkk..",
    "........",
    "........",
  ],
  spark: [
    "...y....",
    "...y....",
    "...w....",
    "yywwwyy.",
    "...w....",
    "...y....",
    "...y....",
    "........",
  ],
};

export function buildParticleSheet(): { canvas: PixelCanvas; frames: [string, number][] } {
  const names = Object.keys(MAPS) as (keyof typeof MAPS)[];
  const canvas = new PixelCanvas(SIZE * names.length, SIZE);
  const legend = {
    k: OUTLINE,
    w: WHITE,
    y: RAMPS.gold[3]!,
    g: RAMPS.sludge[3]!,
    l: RAMPS.sludge[4]!,
    d: RAMPS.sludge[1]!,
    p: RAMPS.hotPink[3]!,
    b: RAMPS.pipe[2]!,
    c: RAMPS.cyan[2]!,
    r: RAMPS.brick[2]!,
    R: RAMPS.brick[3]!,
  };
  names.forEach((name, i) => drawPixelMap(canvas, i * SIZE, 0, MAPS[name], legend));
  return { canvas, frames: names.map((name, i) => [name, i * SIZE]) };
}

export const PARTICLE_SIZE = SIZE;
