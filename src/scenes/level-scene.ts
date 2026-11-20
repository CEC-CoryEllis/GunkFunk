/**
 * Gameplay scene. Builds the stage, spawns the player and stage entities, and
 * runs gameplay on the fixed physics step (WORLD_STEP) so behaviour is
 * identical at any monitor refresh rate. Presentation (camera, parallax,
 * bubbles, held weapon) runs per render frame for smoothness.
 */
import * as Phaser from "phaser";
import { getParallaxLayers } from "../art/texture-registry";
import { audio } from "../audio";
import { DEBUG } from "../config/display";
import {
  GameEvents,
  type HealthChangedPayload,
  PLAYER_HEALTH_KEY,
  PLAYER_WEAPON_KEY,
  type WeaponHudPayload,
} from "../core/game-events";
import { GameSession } from "../core/game-session";
import { PLAYER_ONE_BINDINGS } from "../core/input/bindings";
import { InputSource } from "../core/input/input-source";
import { CameraDirector } from "../gameplay/camera/camera-director";
import { BULGO } from "../gameplay/characters/bulgo";
import { CombatWorld } from "../gameplay/combat/combat-world";
import { overlaps } from "../gameplay/combat/hit-types";
import { Enemy } from "../gameplay/enemies/enemy";
import type { EnemyHandle } from "../gameplay/enemies/enemy-context";
import { createEnemy } from "../gameplay/enemies/enemy-factory";
import { Effects } from "../gameplay/fx/effects";
import { Player } from "../gameplay/player/player";
import type { PropContext } from "../gameplay/props/prop-context";
import { KillCombo } from "../gameplay/scoring/kill-combo";
import { spawnStageEntities } from "../gameplay/stage/spawn-entities";
import type { StageContext, StageEntity } from "../gameplay/stage/stage-context";
import { StageMusic } from "../gameplay/stage/stage-music";
import { ProjectileSystem } from "../gameplay/weapons/projectile-system";
import { WEAPONS } from "../gameplay/weapons/weapon-definitions";
import type { CollectOutcome, OwnedWeapon } from "../gameplay/weapons/weapon-inventory";
import { weaponLevel } from "../gameplay/weapons/weapon-definitions";
import { getLevel } from "../levels/level-registry";
import { LevelWorld } from "../levels/level-world";
import { ParallaxBackground } from "../levels/parallax-background";
import { showPickupBanner, showStageCard } from "../ui/banners";

const GEM_POINTS = 500;
const SECRET_POINTS = 1000;
import { DebugOverlay } from "./debug-overlay";
import { type LevelSceneData, SceneKeys } from "./scene-keys";

export class LevelScene extends Phaser.Scene {
  level!: LevelWorld;
  player!: Player;
  inputSource!: InputSource;
  combat!: CombatWorld;
  projectiles!: ProjectileSystem;
  entities: StageEntity[] = [];
  /** Entities created mid-update (split blobs, dropped items); merged in after the update loop. */
  private pendingEntities: StageEntity[] = [];
  /** Everything stage entities can reach: enemies and props share one context. */
  stageContext!: PropContext;
  readonly killCombo = new KillCombo();
  private music!: StageMusic;
  private musicCheck = 0;
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
    this.combat = new CombatWorld();
    this.projectiles = new ProjectileSystem(this, this.level, this.combat, this.fx);
    this.inputSource = new InputSource(this, PLAYER_ONE_BINDINGS);
    this.checkpoint = this.level.playerStartWorld();
    this.physics.world.setBounds(0, 0, this.level.widthPx, this.level.heightPx + 200);

    const session = GameSession.get(this.game);
    const ctx: StageContext = {
      scene: this,
      level: this.level,
      combat: this.combat,
      fx: this.fx,
      projectiles: this.projectiles,
      addScore: (points, x, y) => {
        session.addScore(points);
        this.fx.score(points, x, y);
      },
    };
    this.player = new Player(
      ctx,
      BULGO,
      {
        onHealthChanged: (health, maxHealth) => this.publishHealth(health, maxHealth),
        onDied: () => this.handlePlayerDeath(),
        onWeaponChanged: (weapon) => this.publishWeapon(weapon),
        onWeaponCollected: (outcome) => this.announceWeapon(outcome),
      },
      this.checkpoint,
    );
    this.music = new StageMusic(definition.music);
    const stage: PropContext = {
      ...ctx,
      player: this.player,
      spawnEnemy: (kind, x, y, options) => {
        this.pendingEntities.push(createEnemy(kind, stage, x, y, options));
      },
      enemyDefeated: (enemy, points) => this.scoreKnockout(enemy, points),
      spawnEntity: (entity) => this.pendingEntities.push(entity),
      liftablesIn: (area) => this.liveEnemies().filter((e) => overlaps(area, e.hurtbox())),
      gemCollected: (x, y) => {
        session.collectGem();
        ctx.addScore(GEM_POINTS, x, y - 12);
      },
      secretEntered: (_region, firstVisit) => {
        this.music.enterSecret(firstVisit);
        if (!firstVisit) return;
        session.foundSecret();
        ctx.addScore(SECRET_POINTS, this.player.x, this.player.y - 40);
        showPickupBanner(this, "SECRET FOUND!", `+${SECRET_POINTS} BONUS`);
      },
      secretLeft: () => this.music.leaveSecret(),
      collidePlayerWith: (object) => {
        this.physics.add.collider(
          this.player.sprite,
          object,
          undefined,
          () => !this.player.movement.droppingThrough,
        );
      },
    };
    this.stageContext = stage;
    this.pendingEntities = [];
    this.entities = spawnStageEntities(stage, this.level.parsed, this.player);
    this.physics.add.collider(this.player.sprite, this.level.layer, undefined, (_p, tile) =>
      this.level.allowsTileCollision(
        this.player.sprite.body as Phaser.Physics.Arcade.Body,
        tile as Phaser.Tilemaps.Tile,
        this.player.movement.droppingThrough,
      ),
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

    this.publishHealth(this.player.health.health, this.player.health.maxHealth);
    this.publishWeapon(this.player.combat.inventory.current);
    this.scene.launch(SceneKeys.Hud);
    this.music.start();
    showStageCard(this, definition.title, definition.subtitle);
    this.time.delayedCall(1800, () => this.player.say("start", true));
    this.cameras.main.fadeIn(300);
    if (DEBUG) this.debug = new DebugOverlay(this);
  }

  private publishHealth(health: number, maxHealth: number): void {
    const payload: HealthChangedPayload = { health, maxHealth };
    this.registry.set(PLAYER_HEALTH_KEY, payload);
    this.game.events.emit(GameEvents.HealthChanged, payload);
  }

  private publishWeapon(weapon: OwnedWeapon | null): void {
    const payload: WeaponHudPayload | null = weapon && {
      id: weapon.id,
      name: WEAPONS[weapon.id].name,
      level: weapon.level,
      ammo: weapon.ammo,
      maxAmmo: WEAPONS[weapon.id].maxAmmo,
      infinite: this.player.combat.inventory.infiniteAmmo,
    };
    this.registry.set(PLAYER_WEAPON_KEY, payload);
    this.game.events.emit(GameEvents.WeaponChanged, payload);
  }

  private announceWeapon({ kind, weapon }: CollectOutcome): void {
    const def = WEAPONS[weapon.id];
    if (kind === "new") showPickupBanner(this, "NEW WEAPON!", def.name);
    else if (kind === "upgraded") {
      showPickupBanner(
        this,
        `${def.name} LEVEL ${weapon.level}`,
        weaponLevel(weapon.id, weapon.level).blurb,
      );
    } else showPickupBanner(this, def.name, "AMMO REFILL!");
  }

  private fixedUpdate(delta: number): void {
    if (this.fx.frozen) return;
    const input = this.inputSource.poll();
    if (input.pressed.pause && this.player.life === "alive") {
      this.pauseGame();
      return;
    }
    this.player.fixedUpdate(input, delta);
    this.projectiles.update(delta);
    this.entities = this.entities.filter((entity) => entity.fixedUpdate(delta));
    if (this.pendingEntities.length > 0) {
      this.entities.push(...this.pendingEntities);
      this.pendingEntities = [];
    }
    this.combat.tick(delta);
    this.updateMusic(delta);
  }

  /** Knockout points, multiplied by the kill combo. */
  private scoreKnockout(enemy: EnemyHandle, points: number): void {
    const multiplier = this.killCombo.registerKill(this.time.now / 1000);
    const total = points * multiplier;
    GameSession.get(this.game).addScore(total);
    this.fx.score(total, enemy.x, enemy.y - 36);
    if (multiplier >= 2) {
      this.fx.word(`COMBO x${multiplier}!`, enemy.x, enemy.y - 52, "gold");
      audio.sfx.play("coin", { pitch: 1 + multiplier * 0.15 });
    }
  }

  /** The full band joins in while a fight is going on around the player. */
  private updateMusic(dt: number): void {
    this.musicCheck -= dt;
    if (this.musicCheck > 0) return;
    this.musicCheck = 0.5;
    const nearby = this.liveEnemies().filter(
      (e) => Math.abs(e.x - this.player.x) < 220 && Math.abs(e.y - this.player.y) < 120,
    ).length;
    this.music.update(0.5, nearby);
  }

  liveEnemies(): Enemy[] {
    return this.entities.filter((e): e is Enemy => e instanceof Enemy && !e.gone);
  }

  override update(_time: number, delta: number): void {
    this.cameraDirector.update([this.player], delta / 1000);
    this.parallax.update();
    this.player.frameUpdate(delta / 1000);
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
}
