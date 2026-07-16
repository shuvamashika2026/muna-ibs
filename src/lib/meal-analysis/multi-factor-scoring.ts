import { lookupFoodKnowledge } from "@/lib/meal-analysis/food-knowledge";
import type { ScoreBreakdown } from "@/lib/meal-analysis/types";
import { clampScore } from "@/lib/meal-analysis/types";
import type { FodmapStackingResult } from "@/lib/meal-analysis/fodmap-stacking";
import type { PortionAnalysisResult } from "@/lib/meal-analysis/portion-analysis";
import type { NonFodmapAnalysis } from "@/lib/meal-analysis/non-fodmap-factors";
import type { ToleranceSignal } from "@/lib/meal-analysis/symptom-timing";
import type { PersonalBaseline } from "@/lib/meal-analysis/personal-baseline";

export type MultiFactorInput = {
  ingredientNames: string[];
  fodmap: FodmapStackingResult;
  portion: PortionAnalysisResult;
  nonFodmap: NonFodmapAnalysis;
  matchedTolerance: ToleranceSignal[];
  baseline: PersonalBaseline;
};

export function calculateMultiFactorScore(input: MultiFactorInput): ScoreBreakdown {
  const baseIngredientScore = calculateBaseIngredientScore(input.ingredientNames);
  const stackingScore = Math.min(15, input.fodmap.stackingScore);
  const portionScore = Math.min(15, input.portion.portionScore);
  const nonFodmapScore = Math.min(15, input.nonFodmap.score);

  const personalPatternScore = Math.min(
    20,
    input.matchedTolerance.reduce((sum, signal) => sum + signal.personalPatternScore, 0)
  );

  const currentContextScore = Math.min(10, input.baseline.vulnerabilityScore);

  let protectiveAdjustment = 0;
  for (const signal of input.matchedTolerance) {
    if (signal.state === "Possibly well tolerated") {
      protectiveAdjustment -= Math.min(8, 3 + signal.symptomFreeCount);
    }
  }

  if (input.portion.portionRisk === "Low") {
    protectiveAdjustment -= 2;
  }

  if (input.ingredientNames.includes("garlic-infused oil") && input.ingredientNames.includes("garlic")) {
    // Prefer lower-risk preparation if both mentioned — net protective for whole garlic swap
    protectiveAdjustment -= 2;
  }

  protectiveAdjustment = Math.max(-25, protectiveAdjustment);

  const raw =
    baseIngredientScore +
    stackingScore +
    portionScore +
    nonFodmapScore +
    personalPatternScore +
    currentContextScore +
    protectiveAdjustment;

  return {
    baseIngredientScore,
    stackingScore,
    portionScore,
    nonFodmapScore,
    personalPatternScore,
    currentContextScore,
    protectiveAdjustment,
    finalScore: clampScore(raw),
  };
}

function calculateBaseIngredientScore(ingredientNames: string[]) {
  let score = 0;
  for (const name of ingredientNames) {
    const record = lookupFoodKnowledge(name);
    if (!record) continue;
    const contribution = Math.min(12, Math.round(record.baseRiskScore / 2));
    score += contribution;
  }
  return Math.min(25, score);
}

export function applyDeepSeekScoreAdjustment(
  breakdown: ScoreBreakdown,
  suggestedScore: number,
  reasons: string[]
): { breakdown: ScoreBreakdown; adjusted: boolean; reasons: string[] } {
  if (!reasons.length) {
    return { breakdown, adjusted: false, reasons: [] };
  }

  const delta = suggestedScore - breakdown.finalScore;
  if (Math.abs(delta) <= 10) {
    const finalScore = clampScore(breakdown.finalScore + delta);
    return {
      breakdown: { ...breakdown, finalScore },
      adjusted: delta !== 0,
      reasons,
    };
  }

  const clampedDelta = delta > 0 ? 10 : -10;
  return {
    breakdown: { ...breakdown, finalScore: clampScore(breakdown.finalScore + clampedDelta) },
    adjusted: true,
    reasons: [...reasons, "Score adjustment was limited to ±10 points for safety."],
  };
}

export function buildScoringExplanation(breakdown: ScoreBreakdown): string {
  return [
    `Base ingredient concern: ${breakdown.baseIngredientScore}/25`,
    `FODMAP stacking: ${breakdown.stackingScore}/15`,
    `Portion concern: ${breakdown.portionScore}/15`,
    `Non-FODMAP factors: ${breakdown.nonFodmapScore}/15`,
    `Personal patterns: ${breakdown.personalPatternScore}/20`,
    `Recent context: ${breakdown.currentContextScore}/10`,
    breakdown.protectiveAdjustment
      ? `Protective adjustments: ${breakdown.protectiveAdjustment}`
      : "",
    `Final score: ${breakdown.finalScore}/100`,
  ]
    .filter(Boolean)
    .join("; ");
}
