/**
 * Owns every projectile in flight: pooled sprites, fixed-step flight against
 * the terrain, strikes through the combat world, and impact behaviours —
 * socks vanish in a puff of lint, snot splats (and splits at level 3),
 * chickens explode into feathers.
 */
import * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import { audio } from "../../audio";
import type { LevelWorld } from "../../levels/level-world";
import type { CombatWorld } from "../combat/combat-world";
import { presentHit } from "../combat/hit-feedback";
import { type HitInfo, type Team, rectAround } from "../combat/hit-types";
import type { Effects } from "../fx/effects";
import {
  PROJECTILES,
  type ProjectileDefinition,
  type ProjectileKind,
} from "./projectile-definitions";
import { type ProjectileBody, stepProjectile, steerToward } from "./projectile-motion";

const POOL_SIZE = 64;
const HOMING_RANGE = 170;
const HOMING_TURN_RATE = 5;
const HOMING_DELAY = 0.12;
const SPLIT_SPREAD = 0.45;

export interface FireRequest {
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: Team;
  scale?: number;
  damageBonus?: number;
  splitOnBounce?: boolean;
  homing?: boolean;
}

interface LiveProjectile {
  sprite: Phaser.GameObjects.Sprite;
  def: ProjectileDefinition;
  body: ProjectileBody;
  request: FireRequest;
  scale: number;
  age: number;
  key: string;
}

export class ProjectileSystem {
  private readonly pool: Phaser.GameObjects.Group;
  private live: LiveProjectile[] = [];
  private serial = 0;
  private bounceSoundCooldown = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly level: LevelWorld,
    private readonly combat: CombatWorld,
    private readonly fx: Effects,
  ) {
    this.pool = scene.add.group({ maxSize: POOL_SIZE, classType: Phaser.GameObjects.Sprite });
  }

  get count(): number {
    return this.live.length;
  }

  fire(request: FireRequest): void {
    const def = PROJECTILES[request.kind];
    const sprite = this.pool.get(
      request.x,
      request.y,
      def.sheetKey,
    ) as Phaser.GameObjects.Sprite | null;
    if (!sprite) return;
    const scale = request.scale ?? 1;
    applySheetOrigin(sprite, def.sheetKey);
    sprite.setActive(true).setVisible(true).setDepth(25).setScale(scale).setAlpha(1);
    sprite.play(animationKey(def.sheetKey, def.anim));
    this.live.push({
      sprite,
      def,
      request,
      scale,
      age: 0,
      key: `proj-${++this.serial}`,
      body: {
        x: request.x,
        y: request.y,
        vx: request.vx,
        vy: request.vy,
        radius: def.radius * scale,
        bouncesLeft: def.maxBounces,
      },
    });
  }

  /** Advances every projectile one fixed step. */
  update(dt: number): void {
    this.bounceSoundCooldown = Math.max(0, this.bounceSoundCooldown - dt);
    const solidAt = (x: number, y: number) => this.level.terrainAtWorld(x, y) === "solid";
    const survivors: LiveProjectile[] = [];
    for (const p of this.live) {
      if (this.advance(p, dt, solidAt)) {
        survivors.push(p);
        this.syncSprite(p);
      } else {
        this.pool.killAndHide(p.sprite);
        p.sprite.stop();
      }
    }
    this.live = survivors;
  }

  /** Returns false when the projectile is used up. */
  private advance(
    p: LiveProjectile,
    dt: number,
    solidAt: (x: number, y: number) => boolean,
  ): boolean {
    p.age += dt;
    if (p.age > p.def.lifetime) {
      this.impact(p);
      return false;
    }
    if (p.request.homing && p.age > HOMING_DELAY) {
      const target = this.combat.nearest(p.body.x, p.body.y, p.request.team, HOMING_RANGE);
      if (target) {
        const box = target.hurtbox();
        steerToward(p.body, box.x + box.width / 2, box.y + box.height / 2, HOMING_TURN_RATE, dt);
      }
    }
    const events = stepProjectile(p.body, p.def, dt, solidAt);
    if (events.includes("blocked")) {
      this.impact(p);
      return false;
    }
    if (events.includes("bounce")) {
      if (p.def.bounceSfx && this.bounceSoundCooldown === 0) {
        audio.sfx.play(p.def.bounceSfx, { volume: 0.6 });
        this.bounceSoundCooldown = 0.06;
      }
      if (p.request.splitOnBounce && p.def.kind === "snot") {
        this.split(p);
        return false;
      }
    }
    return !this.tryStrike(p);
  }

  /** Direct hits. Returns true if the projectile was consumed. */
  private tryStrike(p: LiveProjectile): boolean {
    const area = rectAround(p.body.x, p.body.y, p.body.radius);
    if (p.def.onImpact === "explode") {
      // Chickens have a proximity fuse: the blast does the damage.
      if (!this.combat.overlapsAny(area, p.request.team)) return false;
      this.impact(p);
      return true;
    }
    const hit = this.hitInfo(p, "projectile");
    const outcomes = this.combat.strike(area, hit);
    if (outcomes.length === 0) return false;
    for (const o of outcomes) presentHit(this.fx, hit, o.result, p.def.words);
    this.impact(p);
    return true;
  }

  private hitInfo(p: LiveProjectile, kind: "projectile" | "explosion"): HitInfo {
    const direction = p.body.vx >= 0 ? 1 : -1;
    return {
      key: kind === "explosion" ? `${p.key}-blast` : p.key,
      team: p.request.team,
      kind,
      damage: p.def.damage + (p.request.damageBonus ?? 0),
      knockbackX: direction * p.def.knockback.x,
      knockbackY: p.def.knockback.y,
      x: p.body.x,
      y: p.body.y,
      impact: p.def.impact,
      sfx: p.def.hitSfx,
      radial: kind === "explosion",
      status: p.def.kind === "snot" || p.def.kind === "snotSmall" ? "slimed" : undefined,
    };
  }

  private impact(p: LiveProjectile): void {
    const { x, y } = p.body;
    switch (p.def.onImpact) {
      case "vanish":
        this.fx.particles(p.def.particle, x, y, 5);
        break;
      case "splat":
        audio.sfx.play(p.def.hitSfx, { volume: 0.7 });
        this.fx.splat(x, y);
        this.fx.particles(p.def.particle, x, y, 4);
        break;
      case "explode":
        this.explode(p);
        break;
    }
  }

  private explode(p: LiveProjectile): void {
    const radius = (p.def.explosionRadius ?? 24) * p.scale;
    const hit = this.hitInfo(p, "explosion");
    audio.sfx.play(p.def.hitSfx);
    this.fx.burst(p.body.x, p.body.y);
    this.fx.particles(p.def.particle, p.body.x, p.body.y, 14);
    this.fx.shake(p.def.impact * 0.55);
    for (const o of this.combat.strike(rectAround(p.body.x, p.body.y, radius), hit)) {
      presentHit(this.fx, hit, o.result, p.def.words);
    }
  }

  /** Level-3 snot: the big glob bursts into two smaller globs that keep bouncing. */
  private split(p: LiveProjectile): void {
    this.fx.splat(p.body.x, p.body.y);
    const speed = Math.max(140, Math.hypot(p.body.vx, p.body.vy));
    const base = Math.atan2(p.body.vy, p.body.vx);
    for (const offset of [-SPLIT_SPREAD, SPLIT_SPREAD]) {
      this.fire({
        ...p.request,
        kind: "snotSmall",
        x: p.body.x,
        y: p.body.y - 2,
        vx: Math.cos(base + offset) * speed,
        vy: Math.min(-120, Math.sin(base + offset) * speed),
        scale: 1,
        splitOnBounce: false,
      });
    }
  }

  private syncSprite(p: LiveProjectile): void {
    p.sprite.setPosition(Math.round(p.body.x), Math.round(p.body.y));
    if (p.def.faceVelocity) {
      const movingLeft = p.body.vx < 0;
      const angle = Math.atan2(p.body.vy, p.body.vx);
      p.sprite.setFlipX(movingLeft).setRotation(movingLeft ? angle - Math.PI : angle);
    }
  }

  clear(): void {
    for (const p of this.live) this.pool.killAndHide(p.sprite);
    this.live = [];
  }
}
