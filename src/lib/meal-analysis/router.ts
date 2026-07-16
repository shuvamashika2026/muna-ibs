import type { IntelligenceEngineResult } from "@/lib/meal-analysis/intelligence-engine";
import type { MealAnalysisInput } from "@/lib/meal-analysis/types";

export function shouldUseDeepSeek(
  engine: IntelligenceEngineResult,
  input: MealAnalysisInput,
  force = false
): boolean {
  if (force) {
    return true;
  }

  const { analysis } = engine;

  // Simple low-risk meals with high confidence skip DeepSeek (scenario A)
  if (
    analysis.riskLevel === "Low" &&
    analysis.confidence === "High" &&
    analysis.explicitIngredients.length >= 2 &&
    analysis.inferredIngredients.length === 0 &&
    analysis.unknownIngredients.length === 0
  ) {
    return false;
  }

  const vagueDescription = /unknown|restaurant|buffet|curry|sauce|takeaway|mixed|processed|ready meal|biryani|gravy/i.test(
    [input.mealName, input.ingredients, input.notes, input.locationType].join(" ")
  );

  return (
    analysis.confidence === "Low" ||
    engine.unknownIngredientTokens.length >= 2 ||
    engine.isComplexMeal ||
    engine.requiresDeepSeek ||
    analysis.inferredIngredients.length >= 2 ||
    vagueDescription
  );
}
