/**
 * The stage-clear tally: how the bonus is worked out from time, gems and
 * secrets. Pure, so the rules are unit tested and the results screen only
 * presents them.
 */

/** Finishing under par earns points for every second to spare. */
export const PAR_SECONDS = 300;
export const POINTS_PER_SECOND_SPARE = 10;
/** Extra for finding every gem, and for finding every secret. */
export const ALL_GEMS_BONUS = 2000;
export const ALL_SECRETS_BONUS = 2000;

export interface StageResult {
  title: string;
  /** Score when the stage was cleared (before the bonus). */
  score: number;
  seconds: number;
  gems: number;
  gemsTotal: number;
  secrets: number;
  secretsTotal: number;
}

export interface TallyLine {
  label: string;
  value: string;
  bonus: number;
}

export interface Tally {
  lines: TallyLine[];
  bonus: number;
}

export function formatTime(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function tallyStage(result: StageResult): Tally {
  const timeBonus = Math.max(0, Math.floor(PAR_SECONDS - result.seconds)) * POINTS_PER_SECOND_SPARE;
  const allGems = result.gemsTotal > 0 && result.gems >= result.gemsTotal;
  const allSecrets = result.secretsTotal > 0 && result.secrets >= result.secretsTotal;
  const lines: TallyLine[] = [
    { label: "TIME", value: formatTime(result.seconds), bonus: timeBonus },
    {
      label: "FUNK GEMS",
      value: `${Math.min(result.gems, result.gemsTotal)}/${result.gemsTotal}`,
      bonus: allGems ? ALL_GEMS_BONUS : 0,
    },
    {
      label: "SECRETS",
      value: `${result.secrets}/${result.secretsTotal}`,
      bonus: allSecrets ? ALL_SECRETS_BONUS : 0,
    },
  ];
  return { lines, bonus: lines.reduce((sum, line) => sum + line.bonus, 0) };
}
