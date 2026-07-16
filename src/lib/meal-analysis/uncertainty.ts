import type { DecompositionResult } from "@/lib/meal-analysis/decomposition";
import type { PortionAnalysisResult } from "@/lib/meal-analysis/portion-analysis";
import type { MealAnalysisInput } from "@/lib/meal-analysis/types";
import type { PersonalBaseline } from "@/lib/meal-analysis/personal-baseline";

export type UncertaintyResult = {
  confidence: "Low" | "Moderate" | "High";
  missingInformation: string[];
  assumptions: string[];
  whatWouldImproveAccuracy: string[];
  needsClarification: boolean;
  followUpQuestions: string[];
};

export function assessUncertainty(input: {
  meal: MealAnalysisInput;
  decomposition: DecompositionResult;
  portion: PortionAnalysisResult;
  baseline: PersonalBaseline;
  personalObservationCount: number;
}): UncertaintyResult {
  const missingInformation: string[] = [];
  const assumptions: string[] = [];
  const whatWouldImproveAccuracy: string[] = [];
  const followUpQuestions: string[] = [];

  if (input.decomposition.inferredIngredients.length > 0) {
    assumptions.push(
      "Some ingredients were inferred from a typical recipe and are not confirmed facts."
    );
  }

  if (input.decomposition.unknownIngredients.length > 0) {
    missingInformation.push(
      `Unrecognised or unclear items: ${input.decomposition.unknownIngredients
        .slice(0, 3)
        .map((item) => item.ingredient)
        .join(", ")}`
    );
    whatWouldImproveAccuracy.push("Add an ingredient list, recipe, or label photo for unclear meals.");
  }

  if (input.portion.portionInformationMissing) {
    missingInformation.push("Detailed portion size was not provided.");
    whatWouldImproveAccuracy.push("Log approximate grams, cups, pieces, or small/medium/large portion.");
    followUpQuestions.push("Approximately how large was the portion?");
  }

  if (/restaurant|takeaway|take away|buffet|packaged|processed/i.test(input.meal.locationType + input.meal.mealName)) {
    missingInformation.push("Restaurant or packaged meal — hidden ingredients are possible.");
    followUpQuestions.push("Do you know whether the sauce contained onion, garlic, or artificial sweeteners?");
  }

  if (/curry|biryani|gravy|burger|salad dressing/i.test(input.meal.mealName + input.meal.ingredients)) {
    if (!/onion|garlic/i.test(input.meal.ingredients)) {
      followUpQuestions.push("Did this dish contain onion or garlic?");
    }
  }

  if (/milk|latte|coffee|tea/i.test(input.meal.drinks + input.meal.ingredients) && !/lactose.?free/i.test(input.meal.drinks + input.meal.ingredients)) {
    followUpQuestions.push("Was the milk regular or lactose-free?");
  }

  if (!input.meal.cookingMethod.trim()) {
    whatWouldImproveAccuracy.push("Note whether the meal was fried, grilled, or raw.");
    if (/chicken|meat|fish|potato/i.test(input.meal.ingredients + input.meal.mealName)) {
      followUpQuestions.push("Was the meal fried or grilled?");
    }
  }

  let confidenceScore = 0;
  if (input.decomposition.explicitIngredients.length >= 2) confidenceScore += 2;
  if (!input.portion.portionInformationMissing) confidenceScore += 2;
  if (input.decomposition.inferredIngredients.length === 0) confidenceScore += 2;
  if (input.decomposition.unknownIngredients.length === 0) confidenceScore += 2;
  if (input.personalObservationCount >= 3) confidenceScore += 1;
  if (input.baseline.dataQuality === "High") confidenceScore += 1;

  if (input.decomposition.unknownIngredients.length >= 2) confidenceScore -= 2;
  if (input.decomposition.inferredIngredients.length >= 3) confidenceScore -= 1;

  const confidence: UncertaintyResult["confidence"] =
    confidenceScore >= 7 ? "High" : confidenceScore >= 4 ? "Moderate" : "Low";

  const needsClarification =
    confidence === "Low" &&
    followUpQuestions.length > 0 &&
    (input.decomposition.unknownIngredients.length >= 2 || input.decomposition.inferredIngredients.length >= 3);

  return {
    confidence,
    missingInformation: dedupe(missingInformation).slice(0, 8),
    assumptions: dedupe(assumptions).slice(0, 6),
    whatWouldImproveAccuracy: dedupe(whatWouldImproveAccuracy).slice(0, 6),
    needsClarification,
    followUpQuestions: dedupe(followUpQuestions).slice(0, 2),
  };
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
