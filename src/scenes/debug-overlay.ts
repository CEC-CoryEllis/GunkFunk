/**
 * `?debug` overlay: FPS, player state readout, attack hitbox drawing, and the
 * `window.gunkDebug` hooks Playwright uses to inspect and drive the game.
 */
import type * as Phaser from "phaser";
import { audio } from "../audio";
import type { Action } from "../core/input/actions";
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
  };
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
      this.graphics.lineStyle(1, 0xff3060, 1).strokeRectShape(hitbox);
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
      };
    },
    hold: (action) => scene.inputSource.setScripted(action, true),
    release: (action) => scene.inputSource.setScripted(action, false),
    audio: () => ({ unlocked: audio.unlocked, track: audio.music.currentTrack }),
    teleport: (x, y) => {
      const body = scene.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
    },
  };
}
