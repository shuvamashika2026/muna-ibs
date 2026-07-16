import { lookupFoodKnowledge } from "@/lib/meal-analysis/food-knowledge";
import type { ScoreBreakdown } from "@/lib/meal-analysis/types";

export type CounterfactualResult = {
  originalEstimatedScore: number;
  suggestedChanges: Array<{
    change: string;
    reason: string;
    estimatedImpact: "Small" | "Moderate" | "Significant";
  }>;
  estimatedAdjustedScore: number | null;
};

export function buildCounterfactualAnalysis(
  ingredientNames: string[],
  breakdown: ScoreBreakdown
): CounterfactualResult {
  if (breakdown.finalScore < 34) {
    return {
      originalEstimatedScore: breakdown.finalScore,
      suggestedChanges: [],
      estimatedAdjustedScore: null,
    };
  }

  const suggestedChanges: CounterfactualResult["suggestedChanges"] = [];
  let estimatedReduction = 0;

  if (ingredientNames.includes("onion")) {
    suggestedChanges.push({
      change: "Remove onion pieces or use smaller amount",
      reason: "Onion is often high in fructans and contributes to stacking.",
      estimatedImpact: "Moderate",
    });
    estimatedReduction += 10;
  }

  if (ingredientNames.includes("garlic")) {
    suggestedChanges.push({
      change: "Use garlic-infused oil instead of garlic pieces",
      reason: "Infused oil may provide flavour with lower fructan load for some people.",
      estimatedImpact: "Moderate",
    });
    estimatedReduction += 8;
  }

  if (ingredientNames.includes("cream") || ingredientNames.includes("milk")) {
    suggestedChanges.push({
      change: "Try a lactose-free or smaller dairy portion",
      reason: "Lactose content and fat load may matter for some people.",
      estimatedImpact: "Moderate",
    });
    estimatedReduction += 8;
  }

  if (ingredientNames.includes("chilli") || ingredientNames.some((n) => /spicy|fried/.test(n))) {
    suggestedChanges.push({
      change: "Reduce chilli or choose grilled instead of fried preparation",
      reason: "Spice and fat may add non-FODMAP gut irritation for some people.",
      estimatedImpact: "Small",
    });
    estimatedReduction += 5;
  }

  if (ingredientNames.includes("avocado")) {
    suggestedChanges.push({
      change: "Use a smaller avocado portion (around 2 tablespoons)",
      reason: "Avocado is portion-sensitive for polyols.",
      estimatedImpact: "Small",
    });
    estimatedReduction += 4;
  }

  for (const name of ingredientNames) {
    const record = lookupFoodKnowledge(name);
    for (const alt of record?.saferAlternatives ?? []) {
      if (suggestedChanges.length >= 5) break;
      if (suggestedChanges.some((item) => item.change.includes(alt))) continue;
      suggestedChanges.push({
        change: `Consider ${alt} instead of or alongside ${name}`,
        reason: record?.commonConcerns[0] ?? "May reduce fermentable load for some people.",
        estimatedImpact: "Small",
      });
      estimatedReduction += 3;
    }
  }

  suggestedChanges.push({
    change: "Choose a smaller portion",
    reason: "Portion size often changes tolerance more than a single ingredient swap.",
    estimatedImpact: "Moderate",
  });
  estimatedReduction += 6;

  const uniqueChanges = dedupeChanges(suggestedChanges).slice(0, 5);
  const estimatedAdjustedScore = Math.max(0, breakdown.finalScore - Math.min(estimatedReduction, 40));

  return {
    originalEstimatedScore: breakdown.finalScore,
    suggestedChanges: uniqueChanges,
    estimatedAdjustedScore: uniqueChanges.length ? estimatedAdjustedScore : null,
  };
}

function dedupeChanges(changes: CounterfactualResult["suggestedChanges"]) {
  const seen = new Set<string>();
  return changes.filter((item) => {
    if (seen.has(item.change)) return false;
    seen.add(item.change);
    return true;
  });
}
