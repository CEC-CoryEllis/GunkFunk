/**
 * The stage-clear overlay: "STAGE CLEAR!", then the tally lines count in one
 * by one (time, gems, secrets and their bonuses) and the final score. A
 * button press fast-forwards the count; once it's done, any button moves on
 * to the next stage — or, after a world's last stage, "WORLD COMPLETE" and
 * back to the title.
 */
import * as Phaser from "phaser";
import { audio } from "../audio";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/display";
import { PLAYER_ONE_BINDINGS } from "../core/input/bindings";
import { InputSource } from "../core/input/input-source";
import { type StageResult, tallyStage } from "../gameplay/stage/stage-tally";
import { pixelText } from "../ui/text";
import { type LevelSceneData, SceneKeys } from "./scene-keys";

export interface StageClearData {
  result: StageResult;
  /** The stage that follows; none means the world is complete. */
  next?: string;
}

const LINE_DELAY_MS = 450;
const PANEL_W = 236;
const PANEL_H = 132;

export class StageClearScene extends Phaser.Scene {
  private input1!: InputSource;
  private canLeaveAt = Number.POSITIVE_INFINITY;
  private next?: string;

  constructor() {
    super(SceneKeys.StageClear);
  }

  create({ result, next }: StageClearData): void {
    this.next = next;
    this.input1 = new InputSource(this, PLAYER_ONE_BINDINGS);
    const tally = tallyStage(result);
    const cx = GAME_WIDTH / 2;
    const top = (GAME_HEIGHT - PANEL_H) / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0614, 0.45);
    this.add
      .rectangle(cx, top + PANEL_H / 2, PANEL_W, PANEL_H, 0x120822, 0.92)
      .setStrokeStyle(2, 0x4a2a8a);
    const headline = next ? "STAGE CLEAR!" : "WORLD 1 COMPLETE!";
    const heading = pixelText(this, cx, top + 14, headline, "slime", 2)
      .setOrigin(0.5)
      .setScale(0.2);
    this.tweens.add({ targets: heading, scale: 1, duration: 380, ease: "Back.Out" });
    pixelText(this, cx, top + 30, result.title, "pink").setOrigin(0.5);

    const left = cx - PANEL_W / 2 + 14;
    const right = cx + PANEL_W / 2 - 14;
    tally.lines.forEach((line, i) => {
      const y = top + 48 + i * 14;
      this.time.delayedCall(600 + i * LINE_DELAY_MS, () => {
        pixelText(this, left, y, line.label, "white");
        pixelText(this, cx + 18, y, line.value, "gold").setOrigin(0.5, 0);
        if (line.bonus > 0) pixelText(this, right, y, `+${line.bonus}`, "slime").setOrigin(1, 0);
        audio.sfx.play(line.bonus > 0 ? "coin" : "menu_move");
      });
    });
    const totalsAt = 600 + tally.lines.length * LINE_DELAY_MS + 200;
    this.time.delayedCall(totalsAt, () => {
      const y = top + 48 + tally.lines.length * 14 + 8;
      pixelText(this, left, y, "SCORE", "white");
      pixelText(
        this,
        right,
        y,
        String(result.score + tally.bonus).padStart(6, "0"),
        "gold",
      ).setOrigin(1, 0);
      audio.sfx.play("gem");
      this.canLeaveAt = this.time.now + 600;
      if (!next) {
        pixelText(this, cx, top + PANEL_H - 24, "TO BE CONTINUED...", "pink").setOrigin(0.5);
      }
      const prompt = pixelText(this, cx, top + PANEL_H - 12, "PRESS START", "slime").setOrigin(0.5);
      this.time.addEvent({
        delay: 450,
        loop: true,
        callback: () => prompt.setVisible(!prompt.visible),
      });
    });
  }

  override update(time: number): void {
    this.input1.poll();
    if (!this.input1.anyPressed()) return;
    if (time < this.canLeaveAt) {
      // Impatient? Fast-forward the count-up.
      this.time.timeScale = 8;
      return;
    }
    audio.sfx.play("menu_select");
    audio.music.stop(0.4);
    this.scene.stop(SceneKeys.Hud);
    this.scene.stop(SceneKeys.Level);
    if (this.next) {
      const data: LevelSceneData = { levelId: this.next };
      this.scene.start(SceneKeys.Level, data);
    } else {
      this.scene.start(SceneKeys.Title);
    }
  }
}
