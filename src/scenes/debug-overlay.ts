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
import { Enemy } from "../gameplay/enemies/enemy";
import { createEnemy } from "../gameplay/enemies/enemy-factory";
import type { EnemyKind } from "../gameplay/enemies/enemy-kinds";
import { BossArena } from "../gameplay/bosses/boss-arena";
import { FlushOTron } from "../gameplay/bosses/flushotron";
import { TheClog } from "../gameplay/bosses/the-clog";
import { GreaseTrail } from "../gameplay/powerups/grease-trail";
import type { PowerUpId } from "../gameplay/powerups/powerup-ids";
import { PowerUpPickup } from "../gameplay/powerups/powerup-pickup";
import type { ActivePowerUp } from "../gameplay/powerups/powerup-timers";
import { environmentBlast } from "../gameplay/props/environment-blast";
import { MovingPlatform } from "../gameplay/props/moving-platform";
import { type SingleProp, createProp } from "../gameplay/props/prop-factory";
import type { TrashSurprise } from "../gameplay/props/prop-rules";
import { TrashCan } from "../gameplay/props/trash-can";
import { pixelText } from "../ui/text";
import { type PropSnapshot, snapshotProps } from "./debug-props";
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
    /** "bulgo", or the Wrecking Ball's phase. */
    form: string;
    slamming: boolean;
    infiniteAmmo: boolean;
    runSpeed: number;
  };
  powerUps(): ActivePowerUp[];
  /** Starts a power-up as if it had been picked up. */
  grantPowerUp(id: PowerUpId): void;
  /** Places a power-up pickup floating at world (x, y). */
  spawnPowerUp(id: PowerUpId, x: number, y: number): void;
  /** Grease slicks currently on the floor. */
  greaseSlicks(): number;
  /** An environment explosion (like a toxic barrel's) centred on world (x, y). */
  blast(x: number, y: number): void;
  /** The stage's boss fight, or null if the stage has none. `y` is the boss's feet (or hull bottom). */
  boss(): {
    name: string;
    health: number;
    action: string;
    phase: number;
    x: number;
    y: number;
    arena: string;
    gone: boolean;
  } | null;
  /** Sets the boss's health (finish a fight quickly in tests). */
  setBossHealth(health: number): void;
  /** Lands a player hit of `damage` on the boss through its own armour rules. */
  hitBoss(damage: number): void;
  stage(): {
    id: string;
    respawnX: number;
    respawnY: number;
    seconds: number;
    cleared: boolean;
    gemsTotal: number;
    secretsTotal: number;
  };
  dummies(): { x: number; health: number; knockedOut: boolean }[];
  /** Grants a weapon pickup (test shortcut for upgrades). */
  collect(id: WeaponId): void;
  enemies(): {
    id: number;
    kind: string;
    x: number;
    y: number;
    health: number;
    state: string;
    slimed: boolean;
  }[];
  /** Spawns an enemy standing at world (x, y); returns its id. */
  spawnEnemy(kind: EnemyKind, x: number, y: number): number;
  /** Removes every enemy (keeps older e2e scenarios deterministic). */
  clearEnemies(): void;
  /** Full (or the given) health, no invulnerability window (resets between test scenarios). */
  heal(health?: number): void;
  projectiles(): number;
  score(): number;
  /** Interactive props currently on the stage. */
  props(): PropSnapshot[];
  /** Places a prop standing on the floor at world (x, y). */
  spawnProp(kind: SingleProp, x: number, y: number, surprise?: TrashSurprise): void;
  /** Adds a moving platform travelling between two tile positions. */
  spawnPlatform(fromTx: number, fromTy: number, toTx: number, toTy: number): void;
  session(): { gems: number; secrets: number; lives: number };
  terrainAt(x: number, y: number): string;
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
        form: p.ball.phase ?? "bulgo",
        slamming: p.ball.controller.slamming,
        infiniteAmmo: p.combat.inventory.infiniteAmmo,
        runSpeed: p.movement.tuning.runSpeed,
      };
    },
    dummies: () =>
      scene.entities
        .filter((e): e is TrainingDummy => e instanceof TrainingDummy)
        .map((d) => ({ x: d.x, health: d.health, knockedOut: d.knockedOut })),
    projectiles: () => scene.projectiles.count,
    collect: (id) => void scene.player.collectWeapon(id),
    enemies: () =>
      liveEnemies(scene).map((e) => ({
        id: e.id,
        kind: e.kind,
        x: e.x,
        y: e.y,
        health: e.health,
        state: e.state,
        slimed: e.slimed,
      })),
    spawnEnemy: (kind, x, y) => {
      const enemy = createEnemy(kind, scene.stageContext, x, y);
      scene.entities.push(enemy);
      return enemy.id;
    },
    heal: (health) => {
      scene.player.health.health = health ?? scene.player.health.maxHealth;
      scene.player.health.invulnerable = 0;
    },
    clearEnemies: () => {
      for (const e of liveEnemies(scene)) e.remove();
    },
    score: () => GameSession.get(scene.game).score,
    props: () => snapshotProps(scene.entities),
    powerUps: () => scene.player.powerUps.list(),
    grantPowerUp: (id) => void scene.player.collectPowerUp(id),
    spawnPowerUp: (id, x, y) => {
      scene.entities.push(new PowerUpPickup(scene.stageContext, scene.player, id, x, y));
    },
    boss: () => {
      const arena = scene.entities.find((e): e is BossArena => e instanceof BossArena);
      if (!arena) return null;
      const boss = arena.boss;
      const brain = boss instanceof TheClog || boss instanceof FlushOTron ? boss.brain : null;
      const here =
        boss instanceof TheClog
          ? { x: boss.x, y: boss.y }
          : boss instanceof FlushOTron
            ? { x: boss.centerX, y: boss.hullY }
            : { x: 0, y: 0 };
      return {
        name: boss.name,
        health: boss.health,
        action: brain?.action ?? "",
        phase: brain?.phase ?? 1,
        x: boss.gone ? 0 : here.x,
        y: boss.gone ? 0 : here.y,
        arena: arena.state,
        gone: boss.gone,
      };
    },
    setBossHealth: (health) => {
      const arena = scene.entities.find((e): e is BossArena => e instanceof BossArena);
      if (arena?.boss instanceof TheClog || arena?.boss instanceof FlushOTron) {
        arena.boss.health = health;
      }
    },
    hitBoss: (damage) => {
      const arena = scene.entities.find((e): e is BossArena => e instanceof BossArena);
      if (!arena) return;
      const box = arena.boss.hurtbox();
      arena.boss.takeHit({
        key: `debug-hit-${scene.time.now}-${Math.random()}`,
        team: "player",
        kind: "melee",
        damage,
        knockbackX: 0,
        knockbackY: 0,
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        impact: 0.5,
      });
    },
    stage: () => ({
      id: scene.level.definition.id,
      respawnX: scene.progress.respawnPoint.x,
      respawnY: scene.progress.respawnPoint.y,
      seconds: scene.progress.elapsed,
      cleared: scene.progress.isCleared,
      gemsTotal: scene.progress.gemsTotal,
      secretsTotal: scene.progress.secretsTotal,
    }),
    blast: (x, y) =>
      environmentBlast(scene.stageContext, x, y, { radius: 30, damage: 3, knockback: 300 }),
    greaseSlicks: () =>
      scene.entities.find((e): e is GreaseTrail => e instanceof GreaseTrail)?.count ?? 0,
    spawnProp: (kind, x, y, surprise) => {
      const ctx = scene.stageContext;
      scene.entities.push(
        kind === "trashCan" && surprise
          ? new TrashCan(ctx, x, y, surprise)
          : createProp(kind, ctx, x, y),
      );
    },
    spawnPlatform: (fromTx, fromTy, toTx, toTy) => {
      const path = { from: { tx: fromTx, ty: fromTy }, to: { tx: toTx, ty: toTy } };
      scene.entities.push(new MovingPlatform(scene.stageContext, path));
    },
    session: () => {
      const { gems, secrets, lives } = GameSession.get(scene.game);
      return { gems, secrets, lives };
    },
    terrainAt: (x, y) => scene.level.terrainAtWorld(x, y),
    hold: (action) => scene.inputSource.setScripted(action, true),
    release: (action) => scene.inputSource.setScripted(action, false),
    audio: () => ({ unlocked: audio.unlocked, track: audio.music.currentTrack }),
    teleport: (x, y) => {
      const body = scene.player.sprite.body as Phaser.Physics.Arcade.Body;
      body.reset(x, y);
    },
  };
}

function liveEnemies(scene: LevelScene): Enemy[] {
  return scene.liveEnemies();
}
