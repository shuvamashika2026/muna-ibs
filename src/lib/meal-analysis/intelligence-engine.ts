import type { SupabaseClient } from "@supabase/supabase-js";
import { decomposeMeal } from "@/lib/meal-analysis/decomposition";
import { analyzeFodmapStacking } from "@/lib/meal-analysis/fodmap-stacking";
import { analyzePortion } from "@/lib/meal-analysis/portion-analysis";
import { analyzeNonFodmapFactors } from "@/lib/meal-analysis/non-fodmap-factors";
import { analyzeCookingMethod } from "@/lib/meal-analysis/cooking-method";
import { buildPersonalBaseline } from "@/lib/meal-analysis/personal-baseline";
import {
  buildPersonalIntelligence,
  matchIngredientsToPersonalData,
} from "@/lib/meal-analysis/symptom-timing";
import { findSimilarPastMeals } from "@/lib/meal-analysis/meal-comparison";
import {
  buildScoringExplanation,
  calculateMultiFactorScore,
} from "@/lib/meal-analysis/multi-factor-scoring";
import { assessUncertainty } from "@/lib/meal-analysis/uncertainty";
import { buildCounterfactualAnalysis } from "@/lib/meal-analysis/counterfactual";
import { lookupFoodKnowledge } from "@/lib/meal-analysis/food-knowledge";
import {
  INTELLIGENCE_RULES_VERSION,
  MEAL_ANALYSIS_VERSION,
  PERSONAL_PATTERN_VERSION,
  riskLevelFromScore,
  type MealAnalysisInput,
  type MealAnalysisResult,
  type ScoreBreakdown,
} from "@/lib/meal-analysis/types";
import { IBS_FOOD_KNOWLEDGE_VERSION } from "@/lib/meal-analysis/food-knowledge";

export type IntelligenceEngineResult = {
  analysis: MealAnalysisResult;
  ingredientNames: string[];
  isComplexMeal: boolean;
  requiresDeepSeek: boolean;
  unknownIngredientTokens: string[];
  scoreBreakdown: ScoreBreakdown;
  baselineSummary: string;
  personalSummary: string;
};

export async function runIntelligenceEngine(
  supabase: SupabaseClient,
  userId: string,
  meal: MealAnalysisInput
): Promise<IntelligenceEngineResult> {
  const decomposition = decomposeMeal(meal);
  const ingredientNames = decomposition.allKnownNames;

  const [baseline, personalIntel, similarPastMeals] = await Promise.all([
    buildPersonalBaseline(supabase, userId),
    buildPersonalIntelligence(supabase, userId),
    findSimilarPastMeals(
      supabase,
      userId,
      ingredientNames,
      [meal.mealName, meal.ingredients, meal.drinks].filter(Boolean).join(" | ")
    ),
  ]);

  const fodmap = analyzeFodmapStacking(ingredientNames);
  const portion = analyzePortion(meal, ingredientNames);
  const nonFodmap = analyzeNonFodmapFactors(meal, ingredientNames);
  const cookingMethodAnalysis = analyzeCookingMethod(meal, ingredientNames);

  const { matchedTiming, matchedTolerance } = matchIngredientsToPersonalData(
    ingredientNames,
    personalIntel.timingAssociations,
    personalIntel.toleranceSignals
  );

  const scoreBreakdown = calculateMultiFactorScore({
    ingredientNames,
    fodmap,
    portion,
    nonFodmap,
    matchedTolerance,
    baseline,
  });

  const uncertainty = assessUncertainty({
    meal,
    decomposition,
    portion,
    baseline,
    personalObservationCount: matchedTiming.reduce((sum, item) => sum + item.observationCount, 0),
  });

  const counterfactual = buildCounterfactualAnalysis(ingredientNames, scoreBreakdown);
  const riskLevel = riskLevelFromScore(scoreBreakdown.finalScore);

  const protectiveFactors = dedupe([
    ...ingredientNames.flatMap((name) => lookupFoodKnowledge(name)?.positiveFactors ?? []),
    ...matchedTolerance
      .filter((signal) => signal.state === "Possibly well tolerated")
      .map((signal) => signal.summary),
    portion.portionRisk === "Low" ? "Smaller portion may reduce cumulative load." : "",
  ]).slice(0, 8);

  const saferAlternatives = dedupe(
    ingredientNames.flatMap((name) => lookupFoodKnowledge(name)?.saferAlternatives ?? [])
  ).slice(0, 8);

  const possibleSymptoms = inferPossibleSymptoms(fodmap, nonFodmap);

  const isComplexMeal =
    decomposition.inferredIngredients.length >= 2 ||
    decomposition.unknownIngredients.length >= 2 ||
    /restaurant|takeaway|buffet|curry|biryani|gravy|processed|ready meal/i.test(
      [meal.locationType, meal.mealName, meal.notes].join(" ")
    );

  const requiresDeepSeek =
    uncertainty.confidence === "Low" &&
    (isComplexMeal || decomposition.inferredIngredients.length >= 2 || decomposition.unknownIngredients.length >= 1);

  const headline = buildHeadline({ riskLevel, uncertainty, matchedTolerance, matchedTiming });
  const summary = buildSummary({
    meal,
    riskLevel,
    scoreBreakdown,
    decomposition,
    fodmap,
    uncertainty,
    matchedTolerance,
    matchedTiming,
  });

  const recommendation = buildRecommendation({
    riskLevel,
    uncertainty,
    counterfactual,
    matchedTolerance,
  });

  const analysis: MealAnalysisResult = {
    analysisVersion: MEAL_ANALYSIS_VERSION,
    source: "rules",
    riskLevel,
    riskScore: scoreBreakdown.finalScore,
    confidence: uncertainty.confidence,
    headline,
    summary,
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
    cookingMethodAnalysis,
    personalAnalysis: {
      toleranceSignals: matchedTolerance.map((signal) => ({
        ingredient: signal.ingredient,
        state: signal.state,
        observationCount: signal.observationCount,
        summary: signal.summary,
      })),
      possibleTriggerPatterns: matchedTiming.map((item) => ({
        ingredient: item.ingredient,
        symptom: item.symptom,
        observationCount: item.observationCount,
        typicalDelay: item.typicalDelay,
        associationStrength: item.associationStrength,
        confidence: item.confidence === "Higher" ? "High" : item.confidence,
      })),
      similarPastMeals,
      dataQuality: baseline.dataQuality,
      baselineSummary: [
        `IBS type: ${baseline.ibsType}`,
        `Symptom trend: ${baseline.recentSymptomTrend}`,
        baseline.recentBowelPattern,
        baseline.hydrationStatus,
        baseline.sleepStatus,
      ].join(". "),
    },
    scoreBreakdown,
    possibleSymptoms,
    protectiveFactors,
    saferAlternatives,
    counterfactualAnalysis: counterfactual,
    missingInformation: [
      ...uncertainty.missingInformation,
      ...uncertainty.whatWouldImproveAccuracy.map((item) => `Tip: ${item}`),
    ],
    assumptions: uncertainty.assumptions,
    followUpQuestions: uncertainty.followUpQuestions,
    needsClarification: uncertainty.needsClarification,
    recommendation,
    safetyMessage: "",
    disclaimer:
      "This analysis is for informational purposes and does not replace professional medical advice.",
    scoringExplanation: buildScoringExplanation(scoreBreakdown),
    // Legacy flat fields for compatibility
    fodmapFlags: fodmap.flags,
    possibleTriggers: fodmap.flags.map((flag) => ({
      ingredient: flag.ingredient,
      reason: flag.reason,
      confidence: "Moderate" as const,
    })),
    positiveFactors: protectiveFactors,
    portionConsiderations: portion.portionExplanation ? [portion.portionExplanation] : [],
    personalPattern: personalIntel.summary,
    metadata: {
      deepseekCalled: false,
      analysisSource: "rules",
      analysisVersion: MEAL_ANALYSIS_VERSION,
      foodKnowledgeVersion: IBS_FOOD_KNOWLEDGE_VERSION,
      rulesVersion: INTELLIGENCE_RULES_VERSION,
      personalPatternVersion: PERSONAL_PATTERN_VERSION,
    },
  };

  return {
    analysis,
    ingredientNames,
    isComplexMeal,
    requiresDeepSeek,
    unknownIngredientTokens: decomposition.unknownIngredients.map((item) => item.ingredient),
    scoreBreakdown,
    baselineSummary: analysis.personalAnalysis.baselineSummary ?? "",
    personalSummary: personalIntel.summary,
  };
}

function buildHeadline(input: {
  riskLevel: MealAnalysisResult["riskLevel"];
  uncertainty: ReturnType<typeof assessUncertainty>;
  matchedTolerance: ReturnType<typeof matchIngredientsToPersonalData>["matchedTolerance"];
  matchedTiming: ReturnType<typeof matchIngredientsToPersonalData>["matchedTiming"];
}) {
  if (input.uncertainty.needsClarification) {
    return "This meal needs a little more detail before a confident analysis.";
  }

  const personalNote = input.matchedTiming.find((item) => item.associationStrength === "Repeated");
  if (personalNote) {
    return `This meal may be more challenging — your records suggest a possible pattern with ${personalNote.ingredient}.`;
  }

  const tolerated = input.matchedTolerance.find((item) => item.state === "Possibly well tolerated");
  if (tolerated && input.riskLevel !== "High") {
    return `General guidance suggests ${input.riskLevel.toLowerCase()} concern, but ${tolerated.ingredient} has often been tolerated in your logs.`;
  }

  return `This meal may fall in the ${input.riskLevel.toLowerCase()} concern range for some people with IBS.`;
}

function buildSummary(input: {
  meal: MealAnalysisInput;
  riskLevel: MealAnalysisResult["riskLevel"];
  scoreBreakdown: ScoreBreakdown;
  decomposition: ReturnType<typeof decomposeMeal>;
  fodmap: ReturnType<typeof analyzeFodmapStacking>;
  uncertainty: ReturnType<typeof assessUncertainty>;
  matchedTolerance: ReturnType<typeof matchIngredientsToPersonalData>["matchedTolerance"];
  matchedTiming: ReturnType<typeof matchIngredientsToPersonalData>["matchedTiming"];
}) {
  const parts: string[] = [
    `Based on ingredient, portion, stacking, and personal context, this meal scores ${input.scoreBreakdown.finalScore}/100 (${input.riskLevel.toLowerCase()} concern). Individual tolerance varies.`,
  ];

  if (input.decomposition.inferredIngredients.length) {
    parts.push(
      `Some components (${input.decomposition.inferredIngredients
        .slice(0, 4)
        .map((item) => item.ingredient)
        .join(", ")}) were inferred from a typical recipe — not confirmed.`
    );
  }

  if (input.fodmap.stackingConcern) {
    parts.push(input.fodmap.stackingConcern);
  }

  const repeated = input.matchedTiming.find((item) => item.associationStrength === "Repeated");
  if (repeated) {
    parts.push(
      `Your records suggest ${repeated.ingredient} has repeatedly appeared before ${repeated.symptom} within ${repeated.typicalDelay}. This is an association, not causation.`
    );
  }

  const tolerated = input.matchedTolerance.find((item) => item.state === "Possibly well tolerated");
  if (tolerated) {
    parts.push(tolerated.summary);
  }

  if (input.uncertainty.confidence === "Low") {
    parts.push("Confidence is reduced because ingredient or portion details are incomplete.");
  }

  return parts.join(" ");
}

function buildRecommendation(input: {
  riskLevel: MealAnalysisResult["riskLevel"];
  uncertainty: ReturnType<typeof assessUncertainty>;
  counterfactual: ReturnType<typeof buildCounterfactualAnalysis>;
  matchedTolerance: ReturnType<typeof matchIngredientsToPersonalData>["matchedTolerance"];
}) {
  if (input.uncertainty.needsClarification && input.uncertainty.followUpQuestions.length) {
    return `To improve this analysis, consider answering: ${input.uncertainty.followUpQuestions[0]}`;
  }

  if (input.riskLevel === "High") {
    return "You could consider changing one ingredient at a time, trying a smaller portion, or using one of the suggested adjustments, then logging symptoms over the next day.";
  }

  if (input.counterfactual.suggestedChanges.length) {
    return "If you want to lower the estimated score, the suggested adjustments above may help — one change at a time is often easiest to interpret.";
  }

  const mixed = input.matchedTolerance.find((item) => item.state === "Mixed response");
  if (mixed) {
    return `${mixed.ingredient} shows mixed outcomes in your history. A smaller portion test may be easier to interpret than avoiding it entirely.`;
  }

  return "Continue logging meals and symptoms so personal patterns can become clearer over time.";
}

function inferPossibleSymptoms(
  fodmap: ReturnType<typeof analyzeFodmapStacking>,
  nonFodmap: ReturnType<typeof analyzeNonFodmapFactors>
) {
  const symptoms = new Set<string>();
  if (fodmap.fodmapLoad !== "Low") symptoms.add("bloating");
  if (fodmap.fodmapGroupsPresent.includes("Lactose")) symptoms.add("abdominal discomfort");
  if (nonFodmap.factors.some((f) => /caffeine/i.test(f))) symptoms.add("urgency or gut stimulation");
  if (nonFodmap.factors.some((f) => /spice|chilli/i.test(f))) symptoms.add("gut irritation");
  return Array.from(symptoms).slice(0, 6);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export { INTELLIGENCE_RULES_VERSION as RULES_ENGINE_VERSION };
