/**
 * A hidden area (`*` cells in the map). A fake-brick cover hides it until the
 * player steps inside, when it fades away (and back when they leave). The
 * stage is told about each visit: it plays the stinger, pays the bonus once
 * and swaps in the lounge music.
 */
import type * as Phaser from "phaser";
import { TILE_SIZE } from "../../config/display";
import type { CellRegion } from "../../levels/cell-regions";
import type { StageEntity } from "../stage/stage-context";
import type { PropContext } from "./prop-context";

export class SecretZone implements StageEntity {
  private readonly cells: Set<string>;
  private readonly cover: Phaser.Tilemaps.TilemapLayer;
  private inside = false;
  private visited = false;

  constructor(
    private readonly ctx: PropContext,
    readonly region: CellRegion,
  ) {
    this.cells = new Set(region.cells.map((c) => `${c.tx},${c.ty}`));
    this.cover = ctx.level.createSecretCover(region.cells);
  }

  get found(): boolean {
    return this.visited;
  }

  /** True if the world point lies in one of the zone's cells. */
  contains(x: number, y: number): boolean {
    return this.cells.has(`${Math.floor(x / TILE_SIZE)},${Math.floor(y / TILE_SIZE)}`);
  }

  fixedUpdate(): boolean {
    const player = this.ctx.player;
    const body = player.bodyRect();
    const inside =
      player.targetable && this.contains(body.x + body.width / 2, body.y + body.height / 2);
    if (inside && !this.inside) {
      this.ctx.secretEntered(this.region, !this.visited);
      this.visited = true;
      this.fadeCover(0);
    } else if (!inside && this.inside) {
      this.ctx.secretLeft();
      this.fadeCover(1);
    }
    this.inside = inside;
    return true;
  }

  private fadeCover(alpha: number): void {
    const tweens = this.ctx.scene.tweens;
    tweens.killTweensOf(this.cover);
    tweens.add({ targets: this.cover, alpha, duration: 250 });
  }
}
