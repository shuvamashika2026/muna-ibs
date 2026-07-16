import { lookupFoodKnowledge } from "@/lib/meal-analysis/food-knowledge";
import type { MealAnalysisInput } from "@/lib/meal-analysis/types";

export type PortionAnalysisResult = {
  portionRisk: "Low" | "Moderate" | "High" | "Unknown";
  portionExplanation: string;
  portionInformationMissing: boolean;
  portionScore: number;
};

const LARGE_PATTERNS = /\b(large|big|extra|double|full|heaping|generous|bowl|plateful)\b/i;
const SMALL_PATTERNS = /\b(small|tiny|half|light|few|couple|2 tbsp|1 tbsp|tablespoon)\b/i;
const QUANTITY_PATTERNS = /\b(\d+)\s*(g|gram|grams|kg|cup|cups|tbsp|tsp|piece|pieces|slice|slices|ml|oz)\b/i;

export function analyzePortion(input: MealAnalysisInput, ingredientNames: string[]): PortionAnalysisResult {
  const portionText = [input.portionSize, input.notes, input.ingredients].filter(Boolean).join(" ");
  const hasQuantity = QUANTITY_PATTERNS.test(portionText);
  const isLarge = LARGE_PATTERNS.test(portionText) || /^large$/i.test(input.portionSize.trim());
  const isSmall = SMALL_PATTERNS.test(portionText) || /^small$/i.test(input.portionSize.trim());
  const portionMissing = !hasQuantity && !isLarge && !isSmall && /^medium$/i.test(input.portionSize.trim());

  const portionSensitiveCount = ingredientNames.filter((name) => {
    const record = lookupFoodKnowledge(name);
    return record?.portionSensitive;
  }).length;

  let portionRisk: PortionAnalysisResult["portionRisk"] = "Unknown";
  let portionScore = 0;
  let portionExplanation = "";

  if (portionMissing) {
    portionExplanation =
      "Portion size was not specified in detail. FODMAP tolerance is often portion-dependent, so confidence is reduced.";
    portionScore = Math.min(8, 3 + portionSensitiveCount);
  } else if (isLarge) {
    portionRisk = portionSensitiveCount >= 2 ? "High" : portionSensitiveCount >= 1 ? "Moderate" : "Moderate";
    portionExplanation =
      "A larger portion may increase cumulative FODMAP load and meal volume, which some people find harder to tolerate.";
    portionScore = Math.min(15, 8 + portionSensitiveCount * 2);
  } else if (isSmall) {
    portionRisk = "Low";
    portionExplanation =
      "A smaller portion may reduce fermentable load for portion-sensitive ingredients.";
    portionScore = portionSensitiveCount >= 2 ? 4 : 1;
  } else if (hasQuantity || /^medium$/i.test(input.portionSize.trim())) {
    portionRisk = portionSensitiveCount >= 3 ? "Moderate" : "Low";
    portionExplanation = hasQuantity
      ? "Some portion information was provided, which helps assess cumulative exposure."
      : "A medium portion was indicated; individual tolerance may still vary for sensitive ingredients.";
    portionScore = Math.min(10, 2 + portionSensitiveCount);
  }

  return {
    portionRisk,
    portionExplanation,
    portionInformationMissing: portionMissing,
    portionScore,
  };
}
