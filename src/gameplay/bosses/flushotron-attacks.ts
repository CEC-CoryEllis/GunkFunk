/**
 * The Flush-o-Tron's ranged attacks: floor shockwaves from a stomp (jump
 * them!), and the projectiles it lobs, drops and fires.
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { SHOCKWAVE_SHEET_KEY } from "../../art/sprites/bosses/flushotron-sheets";
import { applySheetOrigin } from "../../art/texture-registry";
import { presentHit } from "../combat/hit-feedback";
import type { HitInfo, Rect } from "../combat/hit-types";
import type { StageContext } from "../stage/stage-context";
import { PROJECTILES, type ProjectileKind } from "../weapons/projectile-definitions";
import { lobVelocity } from "../weapons/projectile-motion";

const WAVE_SPEED = 230;
const WAVE_SECONDS = 1.8;

interface Wave {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  direction: 1 | -1;
  age: number;
  key: string;
}

let waveSerial = 0;

/** Ground shockwaves rolling outward from a stomp. Jump over them. */
export class Shockwaves {
  private waves: Wave[] = [];

  constructor(
    private readonly ctx: StageContext,
    private readonly floorY: number,
    /** Waves stop at the arena walls. */
    private readonly bounds: Rect,
  ) {}

  spawn(x: number): void {
    for (const direction of [-1, 1] as const) {
      const sprite = this.ctx.scene.add.sprite(x, this.floorY, SHOCKWAVE_SHEET_KEY).setDepth(19);
      applySheetOrigin(sprite, SHOCKWAVE_SHEET_KEY);
      sprite.play(animationKey(SHOCKWAVE_SHEET_KEY, "roll")).setFlipX(direction < 0);
      this.waves.push({ sprite, x, direction, age: 0, key: `tron-wave-${++waveSerial}` });
    }
  }

  update(dt: number): void {
    this.waves = this.waves.filter((wave) => {
      wave.age += dt;
      wave.x += wave.direction * WAVE_SPEED * dt;
      wave.sprite.setX(wave.x);
      const outside = wave.x < this.bounds.x + 8 || wave.x > this.bounds.x + this.bounds.width - 8;
      if (wave.age > WAVE_SECONDS || outside) {
        wave.sprite.destroy();
        return false;
      }
      this.strike(wave);
      return true;
    });
  }

  clear(): void {
    for (const wave of this.waves) wave.sprite.destroy();
    this.waves = [];
  }

  private strike(wave: Wave): void {
    const hit: HitInfo = {
      key: wave.key,
      team: "enemy",
      kind: "hazard",
      damage: 1,
      knockbackX: wave.direction * 200,
      knockbackY: -260,
      x: wave.x,
      y: this.floorY - 6,
      impact: 0.5,
      sfx: "sludge_splash",
    };
    const area: Rect = { x: wave.x - 10, y: this.floorY - 12, width: 20, height: 12 };
    for (const outcome of this.ctx.combat.strike(area, hit)) {
      presentHit(this.ctx.fx, hit, outcome.result, ["WHUMP!"]);
    }
  }
}

/** Lobs a projectile from `from` to land on `target` (with a fallback arc). */
export function lob(
  ctx: StageContext,
  kind: ProjectileKind,
  from: { x: number; y: number },
  target: { x: number; y: number },
  angle = 55,
): void {
  const gravity = PROJECTILES[kind].gravity;
  const velocity = lobVelocity(target.x - from.x, target.y - from.y, gravity, angle) ?? {
    vx: Math.sign(target.x - from.x || 1) * 140,
    vy: -260,
  };
  ctx.projectiles.fire({ kind, ...from, ...velocity, team: "enemy" });
}

export function fireStraight(
  ctx: StageContext,
  kind: ProjectileKind,
  from: { x: number; y: number },
  velocity: { vx: number; vy: number },
  homing = false,
): void {
  ctx.projectiles.fire({ kind, ...from, ...velocity, team: "enemy", homing });
}
