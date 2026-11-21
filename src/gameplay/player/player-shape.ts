/**
 * The player's physics body shape: standing vs. low (crouch / slide) sizes
 * anchored at the feet, and switching the sprite back to the character's own
 * sheet after a transformation has borrowed it.
 */
import type * as Phaser from "phaser";
import { applySheetOrigin, getSheetInfo } from "../../art/texture-registry";
import type { Rect } from "../combat/hit-types";
import type { CharacterDefinition } from "../characters/character-definition";

export class PlayerShape {
  private low: boolean | null = null;

  constructor(
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private readonly body: Phaser.Physics.Arcade.Body,
    private readonly definition: CharacterDefinition,
  ) {
    applySheetOrigin(sprite, definition.sheetKey);
    this.setLow(false);
  }

  /** Crouching and sliding shrink the body; standing restores it. */
  setLow(low: boolean): void {
    if (low === this.low) return;
    this.low = low;
    const info = getSheetInfo(this.definition.sheetKey);
    const size = low ? this.definition.body.low : this.definition.body.stand;
    this.body.setSize(size.w, size.h, false);
    this.body.setOffset(info.originX - size.w / 2, info.originY - size.h);
  }

  /** Puts the character's own sheet and standing body back (after the Wrecking Ball). */
  restore(): void {
    this.sprite.setTexture(this.definition.sheetKey);
    applySheetOrigin(this.sprite, this.definition.sheetKey);
    this.sprite.anims.timeScale = 1;
    this.low = null;
    this.setLow(false);
  }

  /** The bottom few pixels of the body: what touches floors, hazards and liquids. */
  feetRect(): Rect {
    return {
      x: this.body.left + 2,
      y: this.body.bottom - 6,
      width: this.body.width - 4,
      height: 6,
    };
  }
}
