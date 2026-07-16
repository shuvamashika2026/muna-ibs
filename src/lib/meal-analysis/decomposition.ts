import { lookupFoodKnowledge, matchFoodsInText, splitIngredientText } from "@/lib/meal-analysis/food-knowledge";
import { RECIPE_TEMPLATES } from "@/lib/meal-analysis/recipe-templates";
import type { MealAnalysisInput } from "@/lib/meal-analysis/types";

export type DecomposedIngredient = {
  ingredient: string;
  source: "user_entered" | "recipe_inference" | "unknown";
  confidence: "Low" | "Moderate" | "High";
};

export type DecompositionResult = {
  explicitIngredients: DecomposedIngredient[];
  inferredIngredients: DecomposedIngredient[];
  unknownIngredients: DecomposedIngredient[];
  allKnownNames: string[];
};

export function decomposeMeal(input: MealAnalysisInput): DecompositionResult {
  const combinedText = [input.mealName, input.ingredients, input.drinks, input.notes]
    .filter(Boolean)
    .join(" | ");

  const { matched, unknown: rawUnknown } = matchFoodsInText(combinedText);
  const explicitSet = new Set<string>();

  const explicitIngredients: DecomposedIngredient[] = matched.map(({ record }) => {
    explicitSet.add(record.canonicalName);
    return {
      ingredient: record.canonicalName,
      source: "user_entered" as const,
      confidence: "High" as const,
    };
  });

  const inferredIngredients: DecomposedIngredient[] = [];
  for (const template of RECIPE_TEMPLATES) {
    if (!template.mealPattern.test(combinedText)) continue;

    for (const component of template.likelyComponents) {
      if (explicitSet.has(component.ingredient)) continue;
      if (inferredIngredients.some((item) => item.ingredient === component.ingredient)) continue;

      inferredIngredients.push({
        ingredient: component.ingredient,
        source: "recipe_inference",
        confidence: component.confidence,
      });
    }
  }

  const unknownIngredients: DecomposedIngredient[] = [
    ...rawUnknown.map((token) => ({
      ingredient: token,
      source: "unknown" as const,
      confidence: "Low" as const,
    })),
    ...splitIngredientText(combinedText)
      .filter((token) => !lookupFoodKnowledge(token) && token.length >= 3)
      .filter((token) => !rawUnknown.includes(token))
      .slice(0, 6)
      .map((token) => ({
        ingredient: token,
        source: "unknown" as const,
        confidence: "Low" as const,
      })),
  ];

  const dedupedUnknown = dedupeByIngredient(unknownIngredients).slice(0, 8);
  const allKnownNames = dedupeStrings([
    ...explicitIngredients.map((i) => i.ingredient),
    ...inferredIngredients.map((i) => i.ingredient),
  ]);

  return {
    explicitIngredients: dedupeByIngredient(explicitIngredients),
    inferredIngredients: dedupeByIngredient(inferredIngredients),
    unknownIngredients: dedupedUnknown,
    allKnownNames,
  };
}

function dedupeByIngredient(items: DecomposedIngredient[]) {
  const map = new Map<string, DecomposedIngredient>();
  for (const item of items) {
    map.set(item.ingredient.toLowerCase(), item);
  }
  return Array.from(map.values());
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values));
}
