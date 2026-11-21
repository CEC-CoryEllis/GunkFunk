/**
 * The weapon sprite in Bulgo's fist. It follows the "hand" anchor of whatever
 * frame he's on, so it stays glued to the fist through running, jumping and
 * recoil, and it's only out while he's shooting (or just switched weapons).
 */
import type * as Phaser from "phaser";
import { animationKey } from "../../art/pixel/sprite-sheet";
import {
  HELD_SHEET_KEY,
  MUZZLE_OFFSET,
  heldAnimationName,
} from "../../art/sprites/weapons/held-weapons";
import { applySheetOrigin, getFrameAnchor } from "../../art/texture-registry";
import type { OwnedWeapon } from "./weapon-inventory";

const SHOW_AFTER_SWITCH = 0.5;

export class HeldWeapon {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private showTimer = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly holder: Phaser.GameObjects.Sprite,
    private readonly sheetKey: string,
  ) {
    // Drawn just behind the holder so the fist overlaps the grip.
    this.sprite = scene.add
      .sprite(0, 0, HELD_SHEET_KEY)
      .setDepth(holder.depth - 1)
      .setVisible(false);
    applySheetOrigin(this.sprite, HELD_SHEET_KEY);
  }

  /** Briefly flashes the weapon out (after switching) even when not shooting. */
  showFor(seconds = SHOW_AFTER_SWITCH): void {
    this.showTimer = Math.max(this.showTimer, seconds);
  }

  playFire(weapon: OwnedWeapon): void {
    this.sprite.play(
      animationKey(HELD_SHEET_KEY, heldAnimationName(weapon.id, weapon.level, true)),
    );
  }

  /** Call every render frame after the holder's animation has updated. */
  sync(weapon: OwnedWeapon | null, shooting: boolean, facing: 1 | -1, dt: number): void {
    this.showTimer = Math.max(0, this.showTimer - dt);
    const anchor = getFrameAnchor(this.sheetKey, Number(this.holder.frame.name), "hand");
    const visible =
      weapon !== null &&
      anchor !== undefined &&
      this.holder.visible &&
      (shooting || this.showTimer > 0);
    this.sprite.setVisible(visible);
    if (!visible || !weapon || !anchor) return;
    const handX = this.holder.x + anchor.x * facing;
    const handY = this.holder.y + anchor.y;
    this.sprite.setPosition(Math.round(handX), Math.round(handY)).setFlipX(facing < 0);
    const idle = animationKey(HELD_SHEET_KEY, heldAnimationName(weapon.id, weapon.level, false));
    const firing =
      this.sprite.anims.isPlaying && this.sprite.anims.currentAnim?.key.endsWith("-fire");
    if (!firing && this.sprite.anims.currentAnim?.key !== idle) this.sprite.play(idle);
  }

  /** Where projectiles leave the barrel, in world space. */
  muzzle(holderX: number, holderY: number, facing: 1 | -1): { x: number; y: number } {
    const anchor = getFrameAnchor(this.sheetKey, Number(this.holder.frame.name), "hand") ?? {
      x: 14,
      y: -26,
    };
    return {
      x: holderX + (anchor.x + MUZZLE_OFFSET.x) * facing,
      y: holderY + anchor.y + MUZZLE_OFFSET.y,
    };
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
