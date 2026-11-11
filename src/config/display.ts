/** Internal render resolution (16:9, scales ×5 to 1080p). */
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;

export const TILE_SIZE = 16;

/** Fixed simulation rate; physics steps at this rate regardless of monitor refresh. */
export const PHYSICS_FPS = 60;

export const BACKGROUND_COLOR = "#0b0614";

/** `?debug` in the URL turns on hitbox drawing, the debug overlay and test hooks. */
export const DEBUG =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
