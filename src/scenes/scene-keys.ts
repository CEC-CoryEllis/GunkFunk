export const SceneKeys = {
  Boot: "Boot",
  Title: "Title",
  Level: "Level",
  Hud: "Hud",
  Pause: "Pause",
  GameOver: "GameOver",
  StageClear: "StageClear",
} as const;

export interface LevelSceneData {
  levelId: string;
}
