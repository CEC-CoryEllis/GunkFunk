export const SceneKeys = {
  Boot: "Boot",
  Title: "Title",
  Level: "Level",
  Hud: "Hud",
  Pause: "Pause",
  GameOver: "GameOver",
} as const;

export interface LevelSceneData {
  levelId: string;
}
