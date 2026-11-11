/**
 * Pooled one-shot effect sprites (dust, impact bursts) plus camera juice
 * helpers (shake, hit-stop). One instance per gameplay scene.
 */
import * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import { applySheetOrigin } from "../../art/texture-registry";

const POOL_SIZE = 24;

export class Effects {
  private readonly pools = new Map<string, Phaser.GameObjects.Group>();
  private hitStopUntil = 0;

  constructor(private readonly scene: Phaser.Scene) {
    for (const key of ["fx-dust", "fx-burst"]) {
      this.pools.set(
        key,
        scene.add.group({ maxSize: POOL_SIZE, classType: Phaser.GameObjects.Sprite }),
      );
    }
  }

  private spawn(
    sheet: string,
    anim: string,
    x: number,
    y: number,
    flipX = false,
    depth = 30,
  ): void {
    const pool = this.pools.get(sheet);
    const sprite = pool?.get(x, y, sheet) as Phaser.GameObjects.Sprite | null;
    if (!sprite) return; // pool exhausted: skipping a puff is better than allocating mid-fight
    applySheetOrigin(sprite, sheet);
    sprite
      .setActive(true)
      .setVisible(true)
      .setPosition(Math.round(x), Math.round(y))
      .setFlipX(flipX)
      .setDepth(depth);
    sprite.play(animationKey(sheet, anim));
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => pool!.killAndHide(sprite));
  }

  dust(x: number, y: number, flipX = false): void {
    this.spawn("fx-dust", "puff", x, y, flipX);
  }

  burst(x: number, y: number): void {
    this.spawn("fx-burst", "pop", x, y, false, 40);
  }

  shake(intensity: number, durationMs = 120): void {
    this.scene.cameras.main.shake(durationMs, intensity * 0.012);
  }

  /** Freezes the action for a few frames on heavy hits — sells the impact. */
  hitStop(ms: number): void {
    this.hitStopUntil = Math.max(this.hitStopUntil, this.scene.time.now + ms);
  }

  get frozen(): boolean {
    return this.scene.time.now < this.hitStopUntil;
  }
}
