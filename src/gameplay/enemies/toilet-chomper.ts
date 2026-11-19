/**
 * Toilet Chomper — the tank. Hops after you and bites. While its lid is shut
 * it's armoured from the front: socks and jabs just CLANK off. Hit it from
 * behind, catch it with its lid open mid-bite, or blast it with something
 * heavy (mega punch, exploding chicken, a flying enemy).
 */
import { TOILET_SHEET_KEY } from "../../art/sprites/enemies/toilet-sheet";
import { audio } from "../../audio";
import type { HitInfo } from "../combat/hit-types";
import type { EnemyContext, EnemyStats } from "./enemy-context";
import { Enemy, type HitReaction } from "./enemy";

const STATS: EnemyStats = {
  kind: "toilet",
  sheetKey: TOILET_SHEET_KEY,
  maxHealth: 5,
  points: 250,
  body: { w: 22, h: 26 },
  gravity: 900,
  contactDamage: 1,
  weight: 1.8,
  hurtSfx: "vending_clunk",
  words: ["FLUSHED!", "KER-PLUNK!"],
};

const HOP_INTERVAL = 1.3;
const HOP_SPEED_X = 75;
const HOP_SPEED_Y = 250;
const BITE_RANGE = 34;
const BITE_OPEN_SECONDS = 0.45;
const BITE_SNAP_SECONDS = 0.25;
const BITE_COOLDOWN = 0.8;
const BITE_DAMAGE = 2;
/** Hits this heavy smash straight through the closed lid. */
const ARMOUR_PIERCING_IMPACT = 0.9;

type ToiletMode = "idle" | "hop" | "open" | "snap" | "cooldown";

export class ToiletChomper extends Enemy {
  private mode: ToiletMode = "idle";
  private modeTime = 0;

  constructor(ctx: EnemyContext, x: number, y: number) {
    super(ctx, STATS, x, y);
  }

  /** The lid is up while it winds up and bites — that's the opening. */
  get lidOpen(): boolean {
    return this.mode === "open" || this.mode === "snap";
  }

  protected override reactToHit(hit: HitInfo): HitReaction {
    if (this.lidOpen || hit.impact >= ARMOUR_PIERCING_IMPACT) return "normal";
    if (hit.kind === "explosion" || hit.kind === "launched") return "normal";
    const fromFront = Math.sign(hit.x - this.x) === this.facing;
    if (!fromFront) return "normal";
    audio.sfx.play("vending_clunk", { pitch: 1.4 });
    this.ctx.fx.particles("spark", hit.x, hit.y, 4);
    this.ctx.fx.word("CLANK!", this.x, this.y - 34, "white");
    return "blocked";
  }

  protected think(dt: number): void {
    this.modeTime += dt;
    switch (this.mode) {
      case "idle":
      case "cooldown":
        this.play("idle");
        if (this.onGround) this.body.setVelocityX(0);
        if (this.modeTime < (this.mode === "idle" ? HOP_INTERVAL : BITE_COOLDOWN) / this.speedScale)
          break;
        this.facePlayer();
        if (this.playerWithin(BITE_RANGE, 24)) this.enter("open");
        else if (this.playerWithin(260, 80)) this.hop();
        else this.enter("idle");
        break;
      case "hop":
        if (this.modeTime > 0.15 && this.onGround) {
          this.ctx.fx.dust(this.x, this.y);
          audio.sfx.play("mech_stomp", { pitch: 1.6, volume: 0.5 });
          this.enter(this.playerWithin(BITE_RANGE + 10, 24) ? "open" : "idle");
        }
        break;
      case "open":
        this.play("chomp");
        this.body.setVelocityX(0);
        if (this.modeTime > BITE_OPEN_SECONDS) this.bite();
        break;
      case "snap":
        if (this.modeTime > BITE_SNAP_SECONDS) this.enter("cooldown");
        break;
    }
  }

  private hop(): void {
    this.enter("hop");
    this.play("hop", true);
    this.body.setVelocity(this.facing * HOP_SPEED_X * this.speedScale, -HOP_SPEED_Y);
  }

  private bite(): void {
    this.enter("snap");
    audio.sfx.play("toilet_chomp");
    const reach = 26;
    const x = this.facing > 0 ? this.x : this.x - reach;
    this.strike(
      { x, y: this.y - 26, width: reach, height: 22 },
      BITE_DAMAGE,
      this.facing * 220,
      -200,
    );
  }

  private enter(mode: ToiletMode): void {
    this.mode = mode;
    this.modeTime = 0;
  }
}
