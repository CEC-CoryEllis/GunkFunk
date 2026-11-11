/**
 * State that survives across stages within one play-through: lives, score,
 * chosen character. Lives in the Phaser registry so every scene sees the same
 * instance.
 */
import type * as Phaser from "phaser";
import { GameEvents } from "./game-events";

export const STARTING_LIVES = 3;

export class GameSession {
  lives = STARTING_LIVES;
  score = 0;
  characterId = "bulgo";

  constructor(private readonly events: Phaser.Events.EventEmitter) {}

  addScore(points: number): void {
    this.score += points;
    this.events.emit(GameEvents.ScoreChanged, this.score);
  }

  /** Returns false when that was the last life. */
  loseLife(): boolean {
    this.lives -= 1;
    this.events.emit(GameEvents.LivesChanged, Math.max(0, this.lives));
    return this.lives >= 0;
  }

  static get(game: Phaser.Game): GameSession {
    let session = game.registry.get("session") as GameSession | undefined;
    if (!session) {
      session = new GameSession(game.events);
      game.registry.set("session", session);
    }
    return session;
  }

  static reset(game: Phaser.Game): GameSession {
    const session = new GameSession(game.events);
    game.registry.set("session", session);
    return session;
  }
}
