export type ScoreLogCounts = {
  meals: number;
  symptoms: number;
  bowelMovements: number;
};

/** Minimum logs required before showing Gut Score or Flare Risk. */
export function hasEnoughScoreData({ meals, symptoms, bowelMovements }: ScoreLogCounts): boolean {
  return meals > 0 && symptoms > 0 && bowelMovements > 0;
}

export function formatGutScoreDisplay(score: number | null): string {
  return score === null ? "Not enough data" : `${score}/100`;
}

export function formatFlareRiskDisplay(risk: "Low" | "Medium" | "High" | null): string {
  return risk === null ? "Not enough data" : risk;
}

export function formatConfidenceDisplay(confidence: number | null): string {
  return confidence === null ? "Not enough data" : `${confidence}% confidence`;
}
