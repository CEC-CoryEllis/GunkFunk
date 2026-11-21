/**
 * A stage's progression, kept out of the level scene: where Bulgo respawns
 * (checkpoints), how long the run has taken, boss fights (camera lock, music,
 * the HUD health bar) and the stage-clear sequence with its tally.
 */
import type * as Phaser from "phaser";
import { BOSS_HUD_KEY } from "../core/game-events";
import type { GameSession } from "../core/game-session";
import type { BossStatus } from "../gameplay/bosses/boss";
import type { CameraDirector } from "../gameplay/camera/camera-director";
import type { Rect } from "../gameplay/combat/hit-types";
import type { Player } from "../gameplay/player/player";
import type { StageMusic } from "../gameplay/stage/stage-music";
import type { StageResult } from "../gameplay/stage/stage-tally";
import { tallyStage } from "../gameplay/stage/stage-tally";
import type { LevelWorld } from "../levels/level-world";
import { secretCells } from "../levels/level-parser";
import { groupCells } from "../levels/cell-regions";
import { SceneKeys } from "./scene-keys";
import type { StageClearData } from "./stage-clear-scene";

/** Bulgo dances this long before the tally appears. */
const CELEBRATE_MS = 1800;

export interface StageProgressDeps {
  scene: Phaser.Scene;
  level: LevelWorld;
  player: Player;
  music: StageMusic;
  camera: CameraDirector;
  session: GameSession;
  title: string;
}

export class StageProgress {
  /** Where Bulgo comes back after losing a life. */
  respawnPoint: { x: number; y: number };
  private seconds = 0;
  private cleared = false;
  private readonly gemsAtStart: number;
  private readonly secretsAtStart: number;
  readonly gemsTotal: number;
  readonly secretsTotal: number;

  constructor(private readonly deps: StageProgressDeps) {
    this.respawnPoint = deps.level.playerStartWorld();
    this.gemsAtStart = deps.session.gems;
    this.secretsAtStart = deps.session.secrets;
    const spawns = deps.level.parsed.spawns;
    this.gemsTotal = spawns.filter((s) => s.prop === "gem").length;
    this.secretsTotal = groupCells(secretCells(deps.level.parsed)).length;
    deps.scene.registry.set(BOSS_HUD_KEY, null);
  }

  get elapsed(): number {
    return this.seconds;
  }

  get isCleared(): boolean {
    return this.cleared;
  }

  tick(dt: number): void {
    if (!this.cleared) this.seconds += dt;
  }

  checkpointReached(x: number, y: number): void {
    this.respawnPoint = { x, y };
  }

  bossFight(arena: Rect | null): void {
    this.deps.camera.confine(arena);
    this.deps.music.setBossFight(arena !== null);
  }

  bossStatus(status: BossStatus | null): void {
    this.deps.scene.registry.set(BOSS_HUD_KEY, status);
  }

  /** Bulgo reached the exit: dance, fanfare, then the tally overlay. */
  clear(): void {
    if (this.cleared) return;
    this.cleared = true;
    const { scene, player, music, session } = this.deps;
    player.celebrate();
    music.finish();
    scene.time.delayedCall(CELEBRATE_MS, () => {
      const result = this.result();
      session.addScore(tallyStage(result).bonus);
      const data: StageClearData = { result };
      scene.scene.launch(SceneKeys.StageClear, data);
    });
  }

  result(): StageResult {
    const { session, title } = this.deps;
    return {
      title,
      score: session.score,
      seconds: this.seconds,
      gems: session.gems - this.gemsAtStart,
      gemsTotal: this.gemsTotal,
      secrets: session.secrets - this.secretsAtStart,
      secretsTotal: this.secretsTotal,
    };
  }
}
