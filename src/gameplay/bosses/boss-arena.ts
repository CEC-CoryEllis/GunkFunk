/**
 * A boss arena: the stretch between two gate columns (`|`) around a boss (`@`).
 * When Bulgo walks in, the gates slam down behind and ahead of him, the camera
 * locks to the arena, the boss music starts and the boss wakes. Beat it and
 * the gates lift; lose a life and the fight resets for the next attempt.
 */
import type * as Phaser from "phaser";
import { GATE_SHEET_KEY } from "../../art/sprites/stage/stage-sheets";
import { audio } from "../../audio";
import { TILE_SIZE } from "../../config/display";
import type { Cell, CellRegion } from "../../levels/cell-regions";
import type { Rect } from "../combat/hit-types";
import type { PropContext } from "../props/prop-context";
import type { StageEntity } from "../stage/stage-context";
import type { Boss } from "./boss";

export type ArenaState = "waiting" | "fighting" | "won";

/** How far past the entrance gate Bulgo must be before it slams shut. */
const ENTRY_MARGIN = TILE_SIZE * 2;
const GATE_DROP_PX = TILE_SIZE * 3;

export class BossArena implements StageEntity {
  private stateValue: ArenaState = "waiting";
  private readonly gateCells: Cell[];
  private readonly gateSprites: Phaser.GameObjects.Image[];
  readonly area: Rect;

  constructor(
    private readonly ctx: PropContext,
    readonly boss: Boss,
    entrance: CellRegion,
    exit: CellRegion,
  ) {
    this.gateCells = [...entrance.cells, ...exit.cells];
    const left = entrance.minTx * TILE_SIZE;
    const right = (exit.maxTx + 1) * TILE_SIZE;
    this.area = { x: left, y: 0, width: right - left, height: ctx.level.heightPx };
    this.gateSprites = this.gateCells.map(({ tx, ty }) =>
      ctx.scene.add
        .image(tx * TILE_SIZE, ty * TILE_SIZE - GATE_DROP_PX, GATE_SHEET_KEY, 0)
        .setOrigin(0, 0)
        .setDepth(14)
        .setVisible(false),
    );
  }

  get state(): ArenaState {
    return this.stateValue;
  }

  fixedUpdate(): boolean {
    switch (this.stateValue) {
      case "waiting":
        if (this.playerInside()) this.startFight();
        break;
      case "fighting":
        this.ctx.bossStatus({
          name: this.boss.name,
          health: this.boss.health,
          maxHealth: this.boss.maxHealth,
        });
        if (this.boss.gone) this.win();
        break;
      case "won":
        break;
    }
    return true;
  }

  playerRespawned(): void {
    if (this.stateValue !== "fighting") return;
    this.stateValue = "waiting";
    this.boss.reset();
    this.setGates(false);
    this.ctx.bossFight(null);
    this.ctx.bossStatus(null);
  }

  private playerInside(): boolean {
    const player = this.ctx.player;
    return (
      player.targetable &&
      player.x > this.area.x + ENTRY_MARGIN &&
      player.x < this.area.x + this.area.width - TILE_SIZE
    );
  }

  private startFight(): void {
    this.stateValue = "fighting";
    this.setGates(true);
    this.ctx.bossFight(this.area, this.boss.music);
    this.boss.engage();
  }

  private win(): void {
    this.stateValue = "won";
    this.ctx.bossFight(null);
    this.ctx.bossStatus(null);
    if (this.boss.endsStage) {
      this.ctx.exitReached();
      return;
    }
    this.setGates(false);
  }

  private setGates(closed: boolean): void {
    this.ctx.level.setBlocking(this.gateCells, closed);
    audio.sfx.play("mech_stomp");
    this.ctx.fx.shake(closed ? 0.6 : 0.3, 200);
    this.gateCells.forEach(({ ty }, i) => {
      const sprite = this.gateSprites[i]!;
      const down = ty * TILE_SIZE;
      this.ctx.scene.tweens.killTweensOf(sprite);
      sprite.setVisible(true);
      this.ctx.scene.tweens.add({
        targets: sprite,
        y: closed ? down : down - GATE_DROP_PX,
        alpha: closed ? 1 : 0,
        duration: closed ? 260 : 500,
        ease: closed ? "Bounce.Out" : "Quad.In",
        onComplete: () => sprite.setVisible(closed),
      });
    });
  }
}
