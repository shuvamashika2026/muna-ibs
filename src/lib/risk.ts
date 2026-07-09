export type RiskInput = {
  painLevel: number;
  stressLevel: number;
  waterToday: number;
  waterGoal: number;
  sleepHours: number;
  hasHighFodmapMeal: boolean;
  bristolType: number;
};

export type RiskResult = {
  score: number;
  level: "Low" | "Moderate" | "High";
  reasons: string[];
  recommendations: string[];
};

export function calculateRisk(input: RiskInput): RiskResult {
  let score = 0;
  const reasons: string[] = [];
  const recommendations: string[] = [];

  if (input.painLevel >= 7) {
    score += 25;
    reasons.push("High pain was logged recently (+25)");
    recommendations.push("Choose gentle meals today and monitor symptoms closely.");
  }

  if (input.stressLevel >= 7) {
    score += 20;
    reasons.push("High stress level was logged recently (+20)");
    recommendations.push("Try light walking, breathing, or a short relaxation break.");
  }

  if (input.waterToday < input.waterGoal) {
    score += 15;
    reasons.push("Water intake is below your profile goal (+15)");
    recommendations.push("Increase water gradually during the day.");
  }

  if (input.sleepHours < 6) {
    score += 20;
    reasons.push("Sleep was below 6 hours (+20)");
    recommendations.push("Prioritise rest, as poor sleep may increase gut sensitivity.");
  }

  if (input.hasHighFodmapMeal) {
    score += 15;
    reasons.push("High-FODMAP meal was logged recently (+15)");
    recommendations.push("Consider lower-FODMAP meals for the next meal.");
  }

  if (input.bristolType === 1 || input.bristolType === 2) {
    score += 10;
    reasons.push("Latest Bristol type suggests constipation tendency (+10)");
    recommendations.push("Track water, fibre tolerance, and movement together.");
  }

  if (input.bristolType === 6 || input.bristolType === 7) {
    score += 10;
    reasons.push("Latest Bristol type suggests diarrhoea tendency (+10)");
    recommendations.push("Review recent meals, stress, and hydration.");
  }

  score = Math.max(0, Math.min(100, score));

  const level = score <= 30 ? "Low" : score <= 60 ? "Moderate" : "High";

  if (reasons.length === 0) {
    reasons.push("No major risk factors detected from your latest logs.");
    recommendations.push("Continue logging consistently so MUNA can learn your patterns.");
  }

  return {
    score,
    level,
    reasons,
    recommendations,
  };
}