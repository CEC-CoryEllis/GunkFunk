/**
 * `?debug` overlay: FPS, player state readout, attack hitbox drawing, and the
 * `window.gunkDebug` hooks Playwright uses to inspect and drive the game.
 */
import type * as Phaser from "phaser";
import { audio } from "../audio";
import { GameSession } from "../core/game-session";
import type { Action } from "../core/input/actions";
import { TrainingDummy } from "../gameplay/targets/training-dummy";
import type { WeaponId } from "../gameplay/weapons/weapon-ids";
import { pixelText } from "../ui/text";
import type { LevelScene } from "./level-scene";

declare global {
  interface Window {
    gunkDebug?: GunkTestHooks;
  }
}

export interface GunkTestHooks {
  scene(): string;
  player(): {
    x: number;
    y: number;
    vx: number;
    vy: number;
    state: string;
    life: string;
    health: number;
    anim: string;
    facing: number;
    weapon: { id: string; level: number; ammo: number } | null;
    weapons: string[];
    shooting: boolean;
    charging: boolean;
  };
  dummies(): { x: number; health: number; knockedOut: boolean }[];
  /** Grants a weapon pickup (test shortcut for upgrades). */
  collect(id: WeaponId): void;
  projectiles(): number;
  score(): number;
  hold(action: Action): void;
  release(action: Action): void;
  teleport(x: number, y: number): void;
  audio(): { unlocked: boolean; track: string | null };
}

export class DebugOverlay {
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: LevelScene) {
    this.text = pixelText(scene, 4, 30, "", "white")
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.85);
    this.graphics = scene.add.graphics().setDepth(999);
    scene.physics.world.createDebugGraphic();
    installTestHooks(scene);
  }

  update(): void {
    const p = this.scene.player;
    const body = p.sprite.body as Phaser.Physics.Arcade.Body;
    this.text.setText(
      [
        `FPS ${Math.round(this.scene.game.loop.actualFps)}`,
        `${p.movement.state.toUpperCase()} ${p.life.toUpperCase()}`,
        `X${Math.round(p.x)} Y${Math.round(p.y)}`,
        `VX${Math.round(body.velocity.x)} VY${Math.round(body.velocity.y)}`,
      ].join("\n"),
    );
    this.graphics.clear();
    const hitbox = p.attackHitbox();
    if (hitbox) {
      this.graphics
        .lineStyle(1, 0xff3060, 1)
        .strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    }
  }
}

function installTestHooks(scene: LevelScene): void {
  window.gunkDebug = {
    scene: () => scene.scene.key,
    player: () => {
      const p = scene.player;
      const body = p.sprite.body as Phaser.Physics.Arcade.Body;
      return {
        x: p.x,
        y: p.y,
        vx: body.velocity.x,
        vy: body.velocity.y,
        state: p.movement.state,
        life: p.life,
        health: p.health.health,
        anim: p.sprite.anims.currentAnim?.key ?? "",
        facing: p.facing,
        weapon: p.combat.inventory.current && { ...p.combat.inventory.current },
        weapons: p.combat.inventory.all.map((w) => `${w.id}${w.level}`),
        shooting: p.lastCombat?.shooting ?? false,
        charging: p.lastCombat?.charging ?? false,
      };
    },
    dummies: () =>
      scene.entities
        .filter((e): e is TrainingDummy => e instanceof TrainingDummy)
        .map((d) => ({ x: d.x, health: d.health, knockedOut: d.knockedOut })),
    projectiles: () => scene.projectiles.count,
    collect: (id) => void scene.player.collectWeapon(id),
    score: () => GameSession.get(scene.game).score,
    hold: (action) => scene.inputSource.setScripted(action, true),
    release: (action) => scene.inputSource.setScripted(action, false),
    audio: () => ({ unlocked: audio.unlocked, track: audio.music.currentTrack }),
    teleport: (x, y) => {
      const body = scene.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
    },
  };
}
