/** Tile indices inside a world tileset texture (shared layout across worlds). */
export const TILE = {
  /** 16 autotile variants: brickBase + neighbour mask (N=1, E=2, S=4, W=8). */
  brickBase: 0,
  /** Fully-surrounded variants used to break up repetition. */
  brickInterior: 16,
  grate: 19,
  ladder: 20,
  ladderTop: 21,
  spikes: 22,
  /** 16 autotile variants of cracked (breakable) brick: crackedBase + neighbour mask. */
  crackedBase: 23,
} as const;

export const TILESET_COLUMNS = 8;
export const TILESET_SIZE = 39;
export const INTERIOR_VARIANTS = 3;
