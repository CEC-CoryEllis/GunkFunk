/**
 * Named colour ramps (dark → light). Keeping the palette small and shared is
 * what makes generated art read as one coherent 16-bit game.
 */
import { hex, ramp } from "./pixel/color";

/** Universal outline: a deep purple-black, never pure black (very Genesis). */
export const OUTLINE = hex("#1a0d24");
export const INK = hex("#0d0614");
export const WHITE = hex("#ffffff");

export const RAMPS = {
  // Characters
  mutantGreen: ramp("#1d3a1c", "#2d6526", "#4c9a2e", "#86c93a", "#c8ef6e"),
  mutantSpot: ramp("#3b1d4f", "#6a3a8c", "#9a62c4"),
  flesh: ramp("#4a1029", "#8f2a46", "#d85a72", "#ff9cab"),
  tongue: ramp("#5c0f2b", "#b8325a", "#ff6f96"),
  eyeWhite: ramp("#7f7aa0", "#d6d3ea", "#ffffff"),
  iris: ramp("#2b1460", "#5a2bd0", "#9e78ff"),
  teeth: ramp("#8f7f30", "#e2d78a", "#fffbe0"),
  shorts: ramp("#4d0e1c", "#9c2033", "#e0443f", "#ff8a5c"),
  sneaker: ramp("#24164a", "#463a9a", "#8c86e6", "#e2e0ff"),
  sweatband: ramp("#a06000", "#f0b400", "#fff27a"),

  // World 1 — Sewer of Doom
  brick: ramp("#1c1626", "#3a2a3e", "#5c4052", "#80606a", "#a8868a"),
  sewerStone: ramp("#141822", "#262c3c", "#3c4658", "#5a6a7e", "#8698ac"),
  sludge: ramp("#0e2a10", "#1f5a12", "#3a9a14", "#7bd81e", "#d4ff5a"),
  murk: ramp("#08101a", "#0f1e2c", "#18304a", "#244866"),
  pipe: ramp("#2a1408", "#5c2e10", "#9c5a1c", "#d48a34", "#ffc870"),
  rust: ramp("#3a1206", "#7a2a0c", "#b8541a"),
  metal: ramp("#1e2030", "#3e4460", "#6c7898", "#a8b8d0", "#eef4ff"),
  porcelain: ramp("#5a6a88", "#a8b8d4", "#e8f0ff", "#ffffff"),
  slimeGrime: ramp("#2a2a10", "#4a4a1a", "#6e6a28"),

  // FX / UI
  fire: ramp("#5a0c06", "#c8300c", "#ff8a1a", "#ffe04a", "#fffbe0"),
  gold: ramp("#5a3200", "#a86a00", "#f0b400", "#ffe45a", "#fffbd0"),
  hotPink: ramp("#4a0a3a", "#a01a7a", "#ff3ac8", "#ff9ee8"),
  cyan: ramp("#0a2a4a", "#1a6aa0", "#2ad0ff", "#a0f4ff"),
  uiPurple: ramp("#120822", "#2a1450", "#4a2a8a", "#7a52c8"),
} as const;

export type RampName = keyof typeof RAMPS;
