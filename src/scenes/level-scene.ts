/**
 * Gameplay scene. Builds the stage, spawns the player, and runs gameplay on
 * the fixed physics step (WORLD_STEP) so behaviour is identical at any
 * monitor refresh rate. Presentation (camera, parallax, bubbles) runs per
 * render frame for smoothness.
 */
import * as Phaser from "phaser";
import { getParallaxLayers } from "../art/texture-registry";
import { audio } from "../audio";
import { DEBUG, GAME_WIDTH } from "../config/display";
import { GameEvents, type HealthChangedPayload, PLAYER_HEALTH_KEY } from "../core/game-events";
import { GameSession } from "../core/game-session";
import { PLAYER_ONE_BINDINGS } from "../core/input/bindings";
import { InputSource } from "../core/input/input-source";
import { CameraDirector } from "../gameplay/camera/camera-director";
import { BULGO } from "../gameplay/characters/bulgo";
import { Effects } from "../gameplay/fx/effects";
import { Player } from "../gameplay/player/player";
import { getLevel } from "../levels/level-registry";
import { LevelWorld } from "../levels/level-world";
import { ParallaxBackground } from "../levels/parallax-background";
import { pixelText } from "../ui/text";
import { DebugOverlay } from "./debug-overlay";
import { type LevelSceneData, SceneKeys } from "./scene-keys";

export class LevelScene extends Phaser.Scene {
  level!: LevelWorld;
  player!: Player;
  inputSource!: InputSource;
  private fx!: Effects;
  private cameraDirector!: CameraDirector;
  private parallax!: ParallaxBackground;
  private debug?: DebugOverlay;
  private checkpoint!: { x: number; y: number };

  constructor() {
    super(SceneKeys.Level);
  }

  create(data: LevelSceneData): void {
    const definition = getLevel(data.levelId);
    this.level = new LevelWorld(this, definition);
    this.parallax = new ParallaxBackground(this, getParallaxLayers());
    this.fx = new Effects(this);
    this.inputSource = new InputSource(this, PLAYER_ONE_BINDINGS);
    this.checkpoint = this.level.playerStartWorld();
    this.physics.world.setBounds(0, 0, this.level.widthPx, this.level.heightPx + 200);

    this.player = new Player(
      this,
      this.level,
      this.fx,
      BULGO,
      {
        onHealthChanged: (health, maxHealth) => this.publishHealth(health, maxHealth),
        onDied: () => this.handlePlayerDeath(),
      },
      this.checkpoint,
    );
    this.physics.add.collider(this.player.sprite, this.level.layer, undefined, (_p, tile) =>
      this.allowTileCollision(tile as Phaser.Tilemaps.Tile),
    );

    this.cameraDirector = new CameraDirector(
      this.cameras.main,
      new Phaser.Geom.Rectangle(0, 0, this.level.widthPx, this.level.heightPx),
      this.checkpoint,
    );
    this.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, this.fixedUpdate, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.physics.world.off(Phaser.Physics.Arcade.Events.WORLD_STEP, this.fixedUpdate, this);
    });

    this.scene.launch(SceneKeys.Hud);
    this.publishHealth(this.player.health.health, this.player.health.maxHealth);
    audio.music.play(definition.music, { fadeInSeconds: 0.5 });
    // Intensity 1 brings in the lead hook; bosses and big set pieces push it to 2.
    audio.music.setIntensity(1);
    this.showStageCard(definition.title, definition.subtitle);
    this.time.delayedCall(1800, () => this.player.say("start", true));
    this.cameras.main.fadeIn(300);
    if (DEBUG) this.debug = new DebugOverlay(this);
  }

  private publishHealth(health: number, maxHealth: number): void {
    const payload: HealthChangedPayload = { health, maxHealth };
    this.registry.set(PLAYER_HEALTH_KEY, payload);
    this.game.events.emit(GameEvents.HealthChanged, payload);
  }

  /** One-way tiles only collide when falling onto them from above and not dropping through. */
  private allowTileCollision(tile: Phaser.Tilemaps.Tile): boolean {
    if (!this.level.isOneWayTile(tile)) return true;
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.player.movement.droppingThrough) return false;
    return body.velocity.y >= 0 && body.prev.y + body.height <= tile.pixelY + 4;
  }

  private fixedUpdate(delta: number): void {
    if (this.fx.frozen) return;
    const input = this.inputSource.poll();
    if (input.pressed.pause && this.player.life === "alive") {
      this.pauseGame();
      return;
    }
    this.player.fixedUpdate(input, delta);
  }

  override update(_time: number, delta: number): void {
    this.cameraDirector.update([this.player], delta / 1000);
    this.parallax.update();
    this.player.frameUpdate();
    this.debug?.update();
  }

  private pauseGame(): void {
    audio.sfx.play("pause");
    audio.music.setMuffled(true);
    this.scene.pause();
    this.scene.launch(SceneKeys.Pause);
  }

  private handlePlayerDeath(): void {
    const session = GameSession.get(this.game);
    if (session.loseLife()) {
      this.cameras.main.fadeOut(250);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.player.respawn(this.checkpoint);
        this.cameraDirector.snapTo(this.checkpoint.x, this.checkpoint.y);
        this.cameras.main.fadeIn(250);
      });
    } else {
      this.scene.stop(SceneKeys.Hud);
      this.scene.start(SceneKeys.GameOver);
    }
  }

  private showStageCard(title: string, subtitle: string): void {
    const top = pixelText(this, GAME_WIDTH / 2, 70, subtitle, "slime")
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(900);
    const main = pixelText(this, GAME_WIDTH / 2, 84, title, "gold")
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(900);
    const bar = this.add
      .rectangle(GAME_WIDTH / 2, 82, GAME_WIDTH, 34, 0x0b0614, 0.8)
      .setScrollFactor(0)
      .setDepth(899);
    const parts = [top, main, bar];
    for (const part of parts) part.x -= GAME_WIDTH;
    this.tweens.add({ targets: parts, x: `+=${GAME_WIDTH}`, duration: 350, ease: "Back.Out" });
    this.tweens.add({
      targets: parts,
      x: `+=${GAME_WIDTH}`,
      duration: 300,
      delay: 1900,
      ease: "Back.In",
      onComplete: () => parts.forEach((p) => p.destroy()),
    });
  }
}
