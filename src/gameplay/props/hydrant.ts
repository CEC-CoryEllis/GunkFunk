/**
 * A fire hydrant. Punch the cap off and it blasts a jet of water away from
 * you for a few seconds, shoving enemies down the corridor (and into sludge,
 * if you line it up right). Hit it again any time to restart the spray.
 */
import type * as Phaser from "phaser";
import { SMALL_PROP_SHEET_KEY } from "../../art/sprites/props/small-props-sheet";
import { RAMPS, WHITE } from "../../art/palettes";
import { toPhaserColor } from "../../art/pixel/color";
import { audio } from "../../audio";
import {
  type Damageable,
  type HitInfo,
  type HitResult,
  MISSED,
  type Rect,
  knockbackFor,
} from "../combat/hit-types";
import type { StageEntity } from "../stage/stage-context";
import type { PropContext } from "./prop-context";
import { PROP_DEPTH, addPropSprite, playIfChanged, wobble } from "./prop-sprite";

export const SPRAY_SECONDS = 4;
export const SPRAY_LENGTH = 64;
const PUSH_INTERVAL = 0.3;
const PUSH_SPEED = 260;
const NOZZLE = { dx: 8, dy: -10 };

const WATER = toPhaserColor(RAMPS.cyan[2]!);
const FOAM = toPhaserColor(WHITE);

let pushSerial = 0;

export class Hydrant implements Damageable, StageEntity {
  readonly team = "neutral" as const;
  readonly targetable = true;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly jet: Phaser.GameObjects.Graphics;
  private sprayLeft = 0;
  private direction = 1;
  private pushTimer = 0;
  private age = 0;

  constructor(
    private readonly ctx: PropContext,
    readonly x: number,
    readonly y: number,
  ) {
    this.sprite = addPropSprite(ctx.scene, SMALL_PROP_SHEET_KEY, x, y, "hydrant");
    this.jet = ctx.scene.add.graphics().setDepth(PROP_DEPTH + 6);
    ctx.combat.register(this);
  }

  get spraying(): boolean {
    return this.sprayLeft > 0;
  }

  hurtbox(): Rect {
    return { x: this.x - 6, y: this.y - 18, width: 12, height: 18 };
  }

  takeHit(hit: HitInfo): HitResult {
    if (hit.damage <= 0) return MISSED;
    this.direction = Math.sign(knockbackFor(hit, this.x)) || 1;
    this.sprayLeft = SPRAY_SECONDS;
    this.pushTimer = 0;
    this.sprite.setFlipX(this.direction < 0);
    playIfChanged(this.sprite, SMALL_PROP_SHEET_KEY, "hydrant_spray");
    wobble(this.ctx.scene, this.sprite);
    audio.sfx.play("hydrant_spray");
    this.ctx.fx.word("SPLOOSH!", this.x, this.y - 30, "white");
    return { applied: true, defeated: false };
  }

  /** The area the water jet covers. */
  sprayRect(): Rect {
    const start = this.x + NOZZLE.dx * this.direction;
    return {
      x: this.direction > 0 ? start : start - SPRAY_LENGTH,
      y: this.y + NOZZLE.dy - 7,
      width: SPRAY_LENGTH,
      height: 14,
    };
  }

  fixedUpdate(dt: number): boolean {
    this.jet.clear();
    if (!this.spraying) return true;
    this.age += dt;
    this.sprayLeft -= dt;
    if (this.sprayLeft <= 0) {
      playIfChanged(this.sprite, SMALL_PROP_SHEET_KEY, "hydrant");
      return true;
    }
    this.pushTimer -= dt;
    if (this.pushTimer <= 0) {
      this.pushTimer = PUSH_INTERVAL;
      this.push();
    }
    this.drawJet();
    return true;
  }

  /** A harmless shove for everything in the jet. */
  private push(): void {
    const area = this.sprayRect();
    const hit: HitInfo = {
      key: `hydrant-${++pushSerial}`,
      team: "player",
      kind: "projectile",
      damage: 0,
      knockbackX: this.direction * PUSH_SPEED,
      knockbackY: -80,
      x: area.x + area.width / 2,
      y: area.y + area.height / 2,
      impact: 0.2,
      sfx: "hydrant_spray",
    };
    this.ctx.combat.strike(area, hit);
    if (Math.floor(this.age / PUSH_INTERVAL) % 2 === 0)
      audio.sfx.play("hydrant_spray", { volume: 0.35 });
    const tipX = this.x + this.direction * (NOZZLE.dx + SPRAY_LENGTH);
    this.ctx.fx.particles("water", tipX, this.y + NOZZLE.dy, 3);
  }

  /** A wobbling band of water, fading out towards the tip. */
  private drawJet(): void {
    const startX = this.x + NOZZLE.dx * this.direction;
    const y = this.y + NOZZLE.dy;
    const fade = Math.min(1, this.sprayLeft / 0.5);
    for (let i = 0; i < SPRAY_LENGTH; i += 2) {
      const spread = 1 + Math.floor((i / SPRAY_LENGTH) * 3);
      const wave = Math.round(Math.sin(this.age * 30 + i * 0.4) * (spread - 1) * 0.6);
      const px = this.direction > 0 ? startX + i : startX - i - 2;
      this.jet.fillStyle(WATER, fade * (1 - (i / SPRAY_LENGTH) * 0.5));
      this.jet.fillRect(px, y - spread + wave, 2, spread * 2);
      if ((i + Math.floor(this.age * 40)) % 6 === 0) {
        this.jet.fillStyle(FOAM, fade);
        this.jet.fillRect(px, y + wave - 1, 2, 1);
      }
    }
  }
}
