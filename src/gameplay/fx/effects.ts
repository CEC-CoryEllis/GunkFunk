/**
 * Visual juice for one gameplay scene: pooled one-shot effect sprites (dust,
 * impact bursts, slime splats), particle bursts (feathers, stuffing, lint),
 * comic-book sound words, camera shake and hit-stop.
 */
import * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { PARTICLE_FRAMES, PARTICLE_TEXTURE } from "../../art/sprites/fx/particle-sheet";
import { applySheetOrigin } from "../../art/texture-registry";
import type { FontStyle } from "../../art/fonts/pixel-font";
import { pixelText } from "../../ui/text";

const POOL_SIZE = 32;

export type ParticleKind = keyof typeof PARTICLE_FRAMES;

export class Effects {
  private readonly pools = new Map<string, Phaser.GameObjects.Group>();
  private readonly emitters = new Map<ParticleKind, Phaser.GameObjects.Particles.ParticleEmitter>();
  private hitStopUntil = 0;
  private resumeTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene) {
    for (const kind of Object.keys(PARTICLE_FRAMES) as ParticleKind[]) {
      this.emitters.set(kind, this.createEmitter(kind));
    }
    // The animation manager is game-wide: never leave it paused if the scene ends mid-freeze.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.endHitStop());
  }

  private createEmitter(kind: ParticleKind): Phaser.GameObjects.Particles.ParticleEmitter {
    const floaty = kind === "feather" || kind === "stuffing";
    return this.scene.add
      .particles(0, 0, PARTICLE_TEXTURE, {
        frame: PARTICLE_FRAMES[kind],
        emitting: false,
        lifespan: floaty ? { min: 700, max: 1300 } : { min: 300, max: 600 },
        speed: floaty ? { min: 40, max: 140 } : { min: 60, max: 180 },
        angle: { min: 200, max: 340 },
        gravityY: floaty ? 90 : 500,
        rotate: floaty ? { start: 0, end: 360 } : 0,
        alpha: { start: 1, end: 0, ease: "Quad.In" },
        maxParticles: 120,
      })
      .setDepth(45);
  }

  /** Plays a one-shot animation from a pooled sprite. */
  play(sheet: string, anim: string, x: number, y: number, flipX = false, depth = 30): void {
    let pool = this.pools.get(sheet);
    if (!pool) {
      pool = this.scene.add.group({ maxSize: POOL_SIZE, classType: Phaser.GameObjects.Sprite });
      this.pools.set(sheet, pool);
    }
    const sprite = pool.get(x, y, sheet) as Phaser.GameObjects.Sprite | null;
    if (!sprite) return; // pool exhausted: skipping a puff is better than allocating mid-fight
    applySheetOrigin(sprite, sheet);
    sprite
      .setActive(true)
      .setVisible(true)
      .setPosition(Math.round(x), Math.round(y))
      .setFlipX(flipX)
      .setDepth(depth);
    sprite.play(animationKey(sheet, anim));
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => pool.killAndHide(sprite));
  }

  dust(x: number, y: number, flipX = false): void {
    this.play("fx-dust", "puff", x, y, flipX);
  }

  burst(x: number, y: number): void {
    this.play("fx-burst", "pop", x, y, false, 40);
  }

  splat(x: number, y: number): void {
    this.play("fx-splat", "splat", x, y, Math.random() < 0.5, 41);
  }

  particles(kind: ParticleKind, x: number, y: number, count: number): void {
    this.emitters.get(kind)?.explode(count, x, y);
  }

  /** A comic-book sound word ("POW!", "BAWK!") that pops in and floats away. */
  word(text: string, x: number, y: number, style: FontStyle = "gold"): void {
    const label = pixelText(this.scene, Math.round(x), Math.round(y), text, style, 2)
      .setOrigin(0.5)
      .setDepth(60)
      .setAngle(Phaser.Math.Between(-12, 12))
      .setScale(0.5);
    this.scene.tweens.add({ targets: label, scale: 2, duration: 120, ease: "Back.Out" });
    this.scene.tweens.add({
      targets: label,
      y: label.y - 18,
      alpha: 0,
      delay: 380,
      duration: 350,
      onComplete: () => label.destroy(),
    });
  }

  /** Small "+100" that drifts up from where points were earned. */
  score(points: number, x: number, y: number): void {
    const label = pixelText(this.scene, Math.round(x), Math.round(y), `+${points}`, "white")
      .setOrigin(0.5)
      .setDepth(61);
    this.scene.tweens.add({
      targets: label,
      y: label.y - 16,
      alpha: 0,
      duration: 700,
      ease: "Quad.Out",
      onComplete: () => label.destroy(),
    });
  }

  shake(intensity: number, durationMs = 120): void {
    this.scene.cameras.main.shake(durationMs, intensity * 0.012);
  }

  /**
   * Freezes physics and every animation for a few milliseconds on heavy hits —
   * the classic arcade trick that makes impacts feel solid.
   */
  hitStop(ms: number): void {
    const now = this.scene.time.now;
    if (now + ms <= this.hitStopUntil) return;
    if (!this.frozen) {
      this.scene.physics.world.pause();
      this.scene.anims.pauseAll();
    }
    this.hitStopUntil = now + ms;
    this.resumeTimer?.remove();
    this.resumeTimer = this.scene.time.delayedCall(ms, () => this.endHitStop());
  }

  private endHitStop(): void {
    if (this.hitStopUntil === 0) return;
    this.hitStopUntil = 0;
    this.scene.physics.world.resume();
    this.scene.anims.resumeAll();
  }

  get frozen(): boolean {
    return this.hitStopUntil > 0;
  }
}
