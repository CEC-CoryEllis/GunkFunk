/**
 * Walks a compiled song's 16th-step grid in time order, looping as the song says.
 * Pure (no Web Audio), so the scheduling maths is unit-testable with a fake clock.
 */
import { songStepAt } from "./compile";
import type { CompiledSong } from "./song-types";
import { stepTime } from "./timing";

export type CursorState = "more" | "ended";

export class StepCursor {
  private readonly song: CompiledSong;
  private readonly startTime: number;
  /** Next playback position (ever-increasing step counter). */
  private position = 0;

  constructor(song: CompiledSong, startTime: number) {
    this.song = song;
    this.startTime = startTime;
  }

  get nextPosition(): number {
    return this.position;
  }

  /** Time of an absolute playback position (swing applied). */
  timeOf(position: number): number {
    return stepTime(this.startTime, position, this.song.bpm, this.song.swing);
  }

  /**
   * Visits every step that starts before `until`, in order. Steps starting before
   * `lateBefore` are passed over silently (the clock already went past them).
   * Returns "ended" once a non-looping song has no steps left.
   */
  advance(
    until: number,
    lateBefore: number,
    visit: (step: number, time: number) => void,
  ): CursorState {
    for (;;) {
      const time = this.timeOf(this.position);
      if (time >= until) return "more";
      const step = songStepAt(this.song, this.position);
      if (step < 0) return "ended";
      if (time >= lateBefore) visit(step, time);
      this.position++;
    }
  }
}
