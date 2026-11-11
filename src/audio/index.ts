/**
 * GUNK FUNK audio — the only module gameplay code should import.
 *
 *   import { audio } from "../audio";
 *   await audio.unlock();          // from the first key press / click
 *   audio.music.play("sewer");
 *   audio.sfx.play("jump", { pan: -0.3 });
 *
 * Safe to import anywhere: nothing touches Web Audio until `unlock()`.
 */
import type { AudioApi } from "./audio-types";
import { AudioSystem } from "./audio-system";

export type * from "./audio-types";

export const audio: AudioApi = new AudioSystem();
