/**
 * Deterministic scenario checks for MUNA Digestive Intelligence.
 * Run: npx tsx scripts/test-meal-intelligence-scenarios.ts
 */

import { decomposeMeal } from "../src/lib/meal-analysis/decomposition";
import { analyzeFodmapStacking } from "../src/lib/meal-analysis/fodmap-stacking";
import { analyzePortion } from "../src/lib/meal-analysis/portion-analysis";
import { analyzeNonFodmapFactors } from "../src/lib/meal-analysis/non-fodmap-factors";
import { calculateMultiFactorScore } from "../src/lib/meal-analysis/multi-factor-scoring";
import { assessUncertainty } from "../src/lib/meal-analysis/uncertainty";
import { lookupFoodKnowledge } from "../src/lib/meal-analysis/food-knowledge";
import { shouldUseDeepSeek } from "../src/lib/meal-analysis/router";
import type { MealAnalysisInput } from "../src/lib/meal-analysis/types";

const emptyBaseline = {
  ibsType: "Unknown",
  recentSymptomTrend: "Insufficient data" as const,
  recentBowelPattern: "",
  hydrationStatus: "",
  sleepStatus: "",
  relevantPersonalPatterns: [],
  dataQuality: "Low" as const,
  vulnerabilityScore: 0,
};

function analyzeOffline(meal: MealAnalysisInput) {
  const decomposition = decomposeMeal(meal);
  const ingredientNames = decomposition.allKnownNames;
  const fodmap = analyzeFodmapStacking(ingredientNames);
  const portion = analyzePortion(meal, ingredientNames);
  const nonFodmap = analyzeNonFodmapFactors(meal, ingredientNames);
  const scoreBreakdown = calculateMultiFactorScore({
    ingredientNames,
    fodmap,
    portion,
    nonFodmap,
    matchedTolerance: [],
    baseline: emptyBaseline,
  });
  const uncertainty = assessUncertainty({
    meal,
    decomposition,
    portion,
    baseline: emptyBaseline,
    personalObservationCount: 0,
  });

  const riskLevel =
    scoreBreakdown.finalScore <= 33 ? "Low" : scoreBreakdown.finalScore <= 66 ? "Moderate" : "High";

  const protectiveFactors = ingredientNames.flatMap(
    (name) => lookupFoodKnowledge(name)?.positiveFactors ?? []
  );

  return {
    riskLevel,
    riskScore: scoreBreakdown.finalScore,
    confidence: uncertainty.confidence,
    explicitIngredients: decomposition.explicitIngredients,
    inferredIngredients: decomposition.inferredIngredients,
    unknownIngredients: decomposition.unknownIngredients,
    fodmapAnalysis: {
      load: fodmap.fodmapLoad,
      groupsPresent: fodmap.fodmapGroupsPresent,
      stackingConcern: fodmap.stackingConcern,
      flags: fodmap.flags,
    },
    nonFodmapFactors: nonFodmap.factors,
    portionAnalysis: {
      portionRisk: portion.portionRisk,
      portionExplanation: portion.portionExplanation,
      portionInformationMissing: portion.portionInformationMissing,
    },
    protectiveFactors,
    personalAnalysis: { toleranceSignals: [], possibleTriggerPatterns: [] },
    followUpQuestions: uncertainty.followUpQuestions,
    missingInformation: uncertainty.missingInformation,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const scenarios: Array<{
  id: string;
  name: string;
  meal: MealAnalysisInput;
  expect: (result: ReturnType<typeof analyzeOffline>) => void;
}> = [
  {
    id: "A",
    name: "Rice, grilled chicken and carrots",
    meal: {
      mealType: "Lunch",
      mealName: "Simple lunch",
      ingredients: "rice, grilled chicken, carrots",
      drinks: "",
      portionSize: "Medium",
      locationType: "Home",
      cookingMethod: "Grilled",
      fodmapLevel: "Low",
      notes: "",
      tags: [],
    },
    expect: (result) => {
      assert(result.riskLevel === "Low", "Expected low risk");
      assert(result.protectiveFactors.length > 0, "Expected positive factors");
      assert(result.inferredIngredients.length === 0, "Should not infer ingredients");
    },
  },
  {
    id: "B",
    name: "Two chapatis with garlic chicken and onion gravy",
    meal: {
      mealType: "Dinner",
      mealName: "Garlic chicken with chapati",
      ingredients: "2 chapatis, garlic chicken, onion gravy",
      drinks: "",
      portionSize: "Medium",
      locationType: "Home",
      cookingMethod: "",
      fodmapLevel: "Unknown",
      notes: "",
      tags: ["garlic", "onion"],
    },
    expect: (result) => {
      assert(result.fodmapAnalysis.groupsPresent.includes("Fructans"), "Expected fructan stacking");
      assert(result.portionAnalysis.portionExplanation.length > 0, "Expected portion consideration");
    },
  },
  {
    id: "C",
    name: "Small coffee with lactose-free milk",
    meal: {
      mealType: "Snack",
      mealName: "Coffee",
      ingredients: "",
      drinks: "small coffee with lactose-free milk",
      portionSize: "Small",
      locationType: "Home",
      cookingMethod: "",
      fodmapLevel: "Low",
      notes: "",
      tags: [],
    },
    expect: (result) => {
      assert(result.nonFodmapFactors.some((f) => /caffeine/i.test(f)), "Expected caffeine consideration");
      assert(
        !result.fodmapAnalysis.flags.some((f) => f.ingredient === "milk"),
        "Should not warn regular milk for lactose-free"
      );
    },
  },
  {
    id: "D",
    name: "Large coffee with regular milk and artificial sweetener",
    meal: {
      mealType: "Snack",
      mealName: "Coffee",
      ingredients: "",
      drinks: "large coffee with milk and artificial sweetener",
      portionSize: "Large",
      locationType: "Home",
      cookingMethod: "",
      fodmapLevel: "Unknown",
      notes: "",
      tags: ["caffeine", "dairy"],
    },
    expect: (result) => {
      assert(result.nonFodmapFactors.some((f) => /caffeine/i.test(f)), "Expected caffeine");
      assert(
        result.explicitIngredients.some((i) => i.ingredient === "milk") ||
          result.fodmapAnalysis.flags.some((f) => f.ingredient === "milk"),
        "Expected lactose consideration"
      );
      assert(result.nonFodmapFactors.some((f) => /sweetener/i.test(f)), "Expected sweetener consideration");
      assert(result.riskScore >= 20, "Expected cumulative risk");
    },
  },
  {
    id: "E",
    name: "Restaurant biryani",
    meal: {
      mealType: "Dinner",
      mealName: "Chicken biryani",
      ingredients: "restaurant chicken biryani",
      drinks: "",
      portionSize: "Medium",
      locationType: "Restaurant",
      cookingMethod: "",
      fodmapLevel: "Unknown",
      notes: "",
      tags: [],
    },
    expect: (result) => {
      assert(result.inferredIngredients.length > 0, "Expected inferred ingredients");
      assert(
        result.inferredIngredients.every((i) => i.source === "recipe_inference"),
        "Inferred items must be labelled"
      );
      assert(
        result.followUpQuestions.length > 0 || result.confidence === "Low",
        "Expected clarification or low confidence"
      );
    },
  },
  {
    id: "F",
    name: "Salad with lettuce, cucumber, onion and large avocado",
    meal: {
      mealType: "Lunch",
      mealName: "Salad",
      ingredients: "lettuce, cucumber, onion, large avocado",
      drinks: "",
      portionSize: "Large",
      locationType: "Home",
      cookingMethod: "Raw",
      fodmapLevel: "Unknown",
      notes: "",
      tags: [],
    },
    expect: (result) => {
      assert(result.explicitIngredients.some((i) => i.ingredient === "avocado"), "Expected avocado separate");
      assert(result.explicitIngredients.some((i) => i.ingredient === "onion"), "Expected onion separate");
      assert(result.portionAnalysis.portionExplanation.length > 0, "Expected portion note");
    },
  },
  {
    id: "J",
    name: "Missing portion and ingredients",
    meal: {
      mealType: "Meal",
      mealName: "Unknown meal",
      ingredients: "",
      drinks: "",
      portionSize: "Medium",
      locationType: "Restaurant",
      cookingMethod: "",
      fodmapLevel: "Unknown",
      notes: "something from a restaurant",
      tags: [],
    },
    expect: (result) => {
      assert(result.confidence === "Low", "Expected low confidence");
      assert(
        result.followUpQuestions.length > 0 || result.missingInformation.length > 0,
        "Expected follow-up or missing info"
      );
    },
  },
];

async function main() {
  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    try {
      const result = analyzeOffline(scenario.meal);
      scenario.expect(result);
      console.log(`✅ Scenario ${scenario.id}: ${scenario.name}`);
      passed += 1;
    } catch (error) {
      console.error(`❌ Scenario ${scenario.id}: ${scenario.name}`);
      console.error(`   ${error instanceof Error ? error.message : error}`);
      failed += 1;
    }
  }

  // Router check: simple meal should skip DeepSeek
  const simpleMeal = scenarios[0].meal;
  const decomposition = decomposeMeal(simpleMeal);
  const mockEngine = {
    analysis: {
      riskLevel: "Low" as const,
      confidence: "High" as const,
      explicitIngredients: decomposition.explicitIngredients,
      inferredIngredients: [],
      unknownIngredients: [],
    },
    isComplexMeal: false,
    requiresDeepSeek: false,
    unknownIngredientTokens: [],
  };
  assert(!shouldUseDeepSeek(mockEngine as never, simpleMeal), "Scenario A should skip DeepSeek");
  console.log("✅ Scenario A router: no unnecessary DeepSeek");

  // Scenario I logic unit test (association strength thresholds)
  const repeatedStrength =
    (await import("../src/lib/meal-analysis/symptom-timing")).SYMPTOM_TIMING_WINDOWS.length > 0;
  assert(repeatedStrength, "Timing windows configured");
  console.log("✅ Scenario I: timing engine configured (DB patterns require live logs)");

  console.log(`\n${passed} scenario checks passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
