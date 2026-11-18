/**
 * How a landed hit looks and sounds. Scales hit-stop, shake and spectacle by
 * the hit's `impact`, and throws a comic-book sound word on big hits and
 * knockouts.
 */
import type { SfxId } from "../../audio/audio-types";
import { audio } from "../../audio";
import type { Effects } from "../fx/effects";
import type { HitInfo, HitKind, HitResult } from "./hit-types";

const DEFAULT_SFX: Readonly<Record<HitKind, SfxId>> = {
  melee: "punch_hit",
  projectile: "enemy_hit",
  explosion: "barrel_explode",
  hazard: "sludge_splash",
  launched: "enemy_squish",
};

const DEFAULT_WORDS: Readonly<Record<HitKind, readonly string[]>> = {
  melee: ["POW!", "BONK!", "WHAM!", "THWACK!", "BOFF!"],
  projectile: ["THWAP!", "SPLUT!", "FWUMP!"],
  explosion: ["KA-BLOOEY!", "BLAMMO!"],
  hazard: ["SIZZLE!"],
  launched: ["BOWLED!", "STRIKE!"],
};

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function presentHit(
  fx: Effects,
  hit: HitInfo,
  result: HitResult,
  words: readonly string[] = DEFAULT_WORDS[hit.kind],
): void {
  if (!result.applied) return;
  audio.sfx.play(hit.sfx ?? DEFAULT_SFX[hit.kind], { pitch: result.defeated ? 0.85 : 1 });
  if (hit.kind === "melee" || hit.kind === "launched") {
    fx.burst(hit.x, hit.y);
    fx.particles("spark", hit.x, hit.y, 3 + Math.round(hit.impact * 5));
    fx.hitStop(35 + hit.impact * 75);
  }
  if (hit.impact >= 0.6 || result.defeated) fx.shake(Math.max(hit.impact, 0.5));
  if (result.defeated || hit.impact >= 0.9) {
    fx.word(pick(words), hit.x, hit.y - 14, result.defeated ? "pink" : "gold");
  }
}
