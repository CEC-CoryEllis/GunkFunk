/**
 * The Flush-o-Tron's body as a rig of part sprites — legs, rocket jets,
 * spring, hull, the professor in the seat, the plunger arm — posed every step
 * from one `RigPose`. Breaking apart (legs blown off, lid launched, professor
 * ejected) is the rig detaching parts.
 */
import type * as Phaser from "phaser";
import { OUTLINE, RAMPS } from "../../art/palettes";
import { toPhaserColor } from "../../art/pixel/color";
import { animationKey } from "../../art/pixel/sprite-sheet";
import {
  ARM_SHEET_KEY,
  HULL_SHEET_KEY,
  type HullState,
  JETS_SHEET_KEY,
  LEGS_SHEET_KEY,
  LID_SHEET_KEY,
  SPRING_SHEET_KEY,
} from "../../art/sprites/bosses/flushotron-sheets";
import { STINKBOTTOM_SHEET_KEY } from "../../art/sprites/bosses/stinkbottom-sheet";
import { applySheetOrigin } from "../../art/texture-registry";

export type LegsPose = "hidden" | "stand" | "walk" | "crouch" | "kneel";
export type SpringPose = "hidden" | "squashed" | "sprung";
export type ProfessorFace = "laugh" | "shout" | "hurt" | "dizzy";

export interface RigPose {
  x: number;
  floorY: number;
  /** World y of the hull's bottom edge. */
  hullBottom: number;
  facing: 1 | -1;
  hull: HullState;
  legs: LegsPose;
  jets: boolean;
  spring: SpringPose;
  professor: ProfessorFace;
  /** Plunger reach in pixels; 0 = tucked away. */
  armLength: number;
}

/** Hull height (bottom edge to the top of the tank lid). */
export const HULL_HEIGHT = 74;
/** How high the legs hold the hull standing, crouched and kneeling. */
export const LEG_HEIGHT: Readonly<Record<LegsPose, number>> = {
  hidden: 0,
  stand: 40,
  walk: 40,
  crouch: 32,
  kneel: 18,
};
export const SPRING_HEIGHT: Readonly<Record<SpringPose, number>> = {
  hidden: 0,
  squashed: 16,
  sprung: 30,
};
/** The seat (relative to the hull's bottom centre, facing right). */
const SEAT = { dx: 12, dy: -36 };
const SHOULDER = { dx: 34, dy: -22 };
/** The plunger angles down so it reaches the floor at full stretch. */
const ARM_ANGLE = 0.55;
const POLE = toPhaserColor(RAMPS.pipe[2]!);
const POLE_SHADOW = toPhaserColor(OUTLINE);

export class TronRig {
  readonly hull: Phaser.GameObjects.Sprite;
  private readonly legs: Phaser.GameObjects.Sprite;
  private readonly jets: Phaser.GameObjects.Sprite;
  private readonly spring: Phaser.GameObjects.Sprite;
  private readonly professor: Phaser.GameObjects.Sprite;
  private readonly cup: Phaser.GameObjects.Sprite;
  private readonly pole: Phaser.GameObjects.Graphics;
  private legsAttached = true;
  private professorAboard = true;
  private pose?: RigPose;

  constructor(private readonly scene: Phaser.Scene) {
    const sprite = (key: string, depth: number) => {
      const s = scene.add.sprite(0, 0, key).setDepth(depth);
      applySheetOrigin(s, key);
      return s;
    };
    this.legs = sprite(LEGS_SHEET_KEY, 16);
    this.jets = sprite(JETS_SHEET_KEY, 16);
    this.spring = sprite(SPRING_SHEET_KEY, 16);
    this.professor = sprite(STINKBOTTOM_SHEET_KEY, 16);
    this.hull = sprite(HULL_SHEET_KEY, 17);
    this.cup = sprite(ARM_SHEET_KEY, 18);
    this.pole = scene.add.graphics().setDepth(18);
    this.jets.play(animationKey(JETS_SHEET_KEY, "burn"));
  }

  apply(pose: RigPose): void {
    this.pose = pose;
    const { x, hullBottom, facing } = pose;
    const flip = facing < 0;
    this.play(this.hull, HULL_SHEET_KEY, pose.hull);
    this.hull.setPosition(x, hullBottom).setFlipX(flip);

    this.legs.setVisible(this.legsAttached && pose.legs !== "hidden");
    if (this.legs.visible) {
      this.play(this.legs, LEGS_SHEET_KEY, pose.legs === "walk" ? "walk" : pose.legs);
      this.legs.setPosition(x, pose.floorY).setFlipX(flip);
    }
    this.jets
      .setVisible(pose.jets)
      .setPosition(x, hullBottom - 4)
      .setFlipX(flip);
    this.spring.setVisible(pose.spring !== "hidden");
    if (this.spring.visible) {
      this.play(this.spring, SPRING_SHEET_KEY, pose.spring);
      this.spring.setPosition(x, hullBottom + SPRING_HEIGHT[pose.spring] + 4);
    }
    if (this.professorAboard) {
      this.play(this.professor, STINKBOTTOM_SHEET_KEY, pose.professor);
      this.professor.setPosition(x + facing * SEAT.dx, hullBottom + SEAT.dy).setFlipX(flip);
    }
    this.drawArm(pose);
  }

  /** Where the plunger cup is, for its hitbox (null while tucked away). */
  armTip(): { x: number; y: number } | null {
    const pose = this.pose;
    if (!pose || pose.armLength < 8) return null;
    const sx = pose.x + pose.facing * SHOULDER.dx;
    const sy = pose.hullBottom + SHOULDER.dy;
    return {
      x: sx + pose.facing * Math.cos(ARM_ANGLE) * pose.armLength,
      y: sy + Math.sin(ARM_ANGLE) * pose.armLength,
    };
  }

  setTint(white: boolean): void {
    for (const part of [this.hull, this.legs, this.professor]) {
      if (white) part.setTintFill(0xffffff);
      else part.clearTint();
    }
  }

  /** Phase 1 → 2: the legs blow off and tumble away. */
  detachLegs(): void {
    if (!this.legsAttached) return;
    this.legsAttached = false;
    const ghost = this.scene.add
      .sprite(this.legs.x, this.legs.y, LEGS_SHEET_KEY, this.legs.frame.name)
      .setOrigin(this.legs.originX, this.legs.originY)
      .setFlipX(this.legs.flipX)
      .setDepth(15);
    this.legs.setVisible(false);
    this.scene.tweens.add({
      targets: ghost,
      y: ghost.y + 40,
      angle: (Math.random() < 0.5 ? -1 : 1) * 40,
      alpha: 0,
      duration: 1400,
      ease: "Quad.In",
      onComplete: () => ghost.destroy(),
    });
  }

  /** Phase 2 → 3: the tank lid rockets off. */
  blowLid(): void {
    const pose = this.pose;
    if (!pose) return;
    const lid = this.scene.add
      .sprite(pose.x - pose.facing * 22, pose.hullBottom - HULL_HEIGHT + 4, LID_SHEET_KEY)
      .setDepth(19);
    applySheetOrigin(lid, LID_SHEET_KEY);
    this.scene.tweens.add({
      targets: lid,
      x: lid.x - pose.facing * 90,
      y: lid.y - 140,
      angle: -pose.facing * 540,
      duration: 900,
      ease: "Quad.Out",
      onComplete: () => lid.destroy(),
    });
  }

  /** Defeat: Stinkbottom is flung out of the seat and off the top of the screen. */
  ejectProfessor(): Phaser.GameObjects.Sprite {
    this.professorAboard = false;
    const p = this.professor;
    p.setDepth(30).play(animationKey(STINKBOTTOM_SHEET_KEY, "ejected"));
    this.scene.tweens.add({
      targets: p,
      y: p.y - 260,
      x: p.x + (Math.random() < 0.5 ? -60 : 60),
      angle: 720,
      duration: 2200,
      ease: "Quad.Out",
    });
    return p;
  }

  /** Back to a whole mech (the fight reset after Bulgo lost a life). */
  rebuild(): void {
    this.legsAttached = true;
    this.professorAboard = true;
    this.scene.tweens.killTweensOf(this.professor);
    this.professor.setAngle(0).setDepth(16).setAlpha(1);
    this.hull.setAlpha(1);
  }

  /** The wreck sinks out of sight. */
  sink(): void {
    const targets = [this.hull, this.spring, this.jets];
    this.scene.tweens.add({ targets, y: "+=60", alpha: 0, duration: 1200, ease: "Quad.In" });
  }

  destroy(): void {
    for (const part of [this.hull, this.legs, this.jets, this.spring, this.professor, this.cup]) {
      part.destroy();
    }
    this.pole.destroy();
  }

  private drawArm(pose: RigPose): void {
    this.pole.clear();
    const tip = this.armTip();
    this.cup.setVisible(tip !== null);
    if (!tip) return;
    const sx = pose.x + pose.facing * SHOULDER.dx;
    const sy = pose.hullBottom + SHOULDER.dy;
    this.pole.lineStyle(6, POLE_SHADOW).lineBetween(sx, sy, tip.x, tip.y);
    this.pole.lineStyle(4, POLE).lineBetween(sx, sy, tip.x, tip.y);
    this.play(this.cup, ARM_SHEET_KEY, pose.armLength > 90 ? "cup_splat" : "cup");
    this.cup
      .setPosition(tip.x, tip.y)
      .setFlipX(pose.facing < 0)
      .setRotation(pose.facing * ARM_ANGLE);
  }

  private play(sprite: Phaser.GameObjects.Sprite, sheet: string, anim: string): void {
    const key = animationKey(sheet, anim);
    if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
  }
}
