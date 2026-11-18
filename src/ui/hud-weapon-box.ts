/**
 * HUD weapon indicator: a framed icon, three level pips and the ammo count.
 * The weapon's name flashes underneath whenever it changes.
 */
import type * as Phaser from "phaser";
import { WEAPON_ICON_SHEET_KEY } from "../art/sprites/weapons/pickup-sheet";
import type { WeaponHudPayload } from "../core/game-events";
import { WEAPON_IDS } from "../gameplay/weapons/weapon-ids";
import { pixelText, setPixelText } from "./text";

const BOX = 20;

export class HudWeaponBox {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly pips: Phaser.GameObjects.Graphics;
  private readonly ammo: Phaser.GameObjects.BitmapText;
  private readonly name: Phaser.GameObjects.BitmapText;
  private current: WeaponHudPayload | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
  ) {
    this.frame = scene.add.graphics();
    this.frame.fillStyle(0x1a0d24).fillRect(x - 1, y - 1, BOX + 2, BOX + 2);
    this.frame.fillStyle(0x2a1450).fillRect(x, y, BOX, BOX);
    this.frame.fillStyle(0x4a2a8a).fillRect(x, y, BOX, 1);
    this.icon = scene.add.image(x + BOX / 2, y + BOX / 2, WEAPON_ICON_SHEET_KEY, 0);
    this.pips = scene.add.graphics();
    this.ammo = pixelText(scene, x + BOX + 4, y + 10, "", "white");
    this.name = pixelText(scene, x, y + BOX + 3, "", "pink").setAlpha(0);
    this.set(null);
  }

  set(weapon: WeaponHudPayload | null): void {
    const changed = weapon?.id !== this.current?.id || weapon?.level !== this.current?.level;
    this.current = weapon;
    this.icon.setVisible(weapon !== null);
    this.pips.clear();
    if (!weapon) {
      setPixelText(this.ammo, "FISTS");
      return;
    }
    this.icon.setFrame(WEAPON_IDS.indexOf(weapon.id));
    for (let i = 0; i < 3; i++) {
      const px = this.x + BOX + 4 + i * 7;
      this.pips.fillStyle(0x1a0d24).fillRect(px - 1, this.y + 1, 7, 7);
      this.pips.fillStyle(i < weapon.level ? 0xf0b400 : 0x2a1450).fillRect(px, this.y + 2, 5, 5);
    }
    const empty = !weapon.infinite && weapon.ammo === 0;
    setPixelText(this.ammo, weapon.infinite ? "x99" : `x${weapon.ammo}`);
    this.ammo.setTint(empty ? 0xff5050 : 0xffffff);
    if (changed) this.flashName(weapon.name);
  }

  private flashName(text: string): void {
    setPixelText(this.name, text);
    this.scene.tweens.killTweensOf(this.name);
    this.name.setAlpha(1);
    this.scene.tweens.add({ targets: this.name, alpha: 0, delay: 1200, duration: 400 });
  }
}
