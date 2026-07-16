import type { MealAnalysisInput } from "@/lib/meal-analysis/types";
import { MEAL_ANALYSIS_DISCLAIMER, MEAL_ANALYSIS_VERSION } from "@/lib/meal-analysis/types";
import type { MealAnalysisResult } from "@/lib/meal-analysis/types";
import { buildMealInputSummary } from "@/lib/meal-analysis/types";

export const MEAL_SAFETY_RED_FLAG_PATTERN =
  /\b(blood in stool|bloody stool|black stool|tarry stool|unexplained weight loss|weight loss|severe persistent abdominal pain|severe abdominal pain|severe pain|repeated vomiting|vomiting|vomit|fever|fainting|passed out|severe dehydration|dehydration|unable to keep fluids down|cannot keep fluids down)\b/i;

export type SafetyCheckResult = {
  matched: boolean;
  matchedTerms: string[];
};

export function detectMealSafetyRedFlags(
  input: MealAnalysisInput,
  mealSummary?: string
): SafetyCheckResult {
  const combined = [
    input.mealName,
    input.ingredients,
    input.drinks,
    input.notes,
    mealSummary ?? buildMealInputSummary(input),
  ].join(" ");

  const matchedTerms = Array.from(
    new Set(
      (combined.match(new RegExp(MEAL_SAFETY_RED_FLAG_PATTERN.source, "gi")) ?? []).map((term) =>
        term.toLowerCase()
      )
    )
  );

  return {
    matched: matchedTerms.length > 0,
    matchedTerms,
  };
}

export function buildSafetyOnlyAnalysis(): MealAnalysisResult {
  return {
    analysisVersion: MEAL_ANALYSIS_VERSION,
    source: "rules",
    riskLevel: "Moderate",
    riskScore: 0,
    confidence: "High",
    headline: "Safety check — food analysis paused",
    summary:
      "Your note may include symptoms that deserve prompt medical assessment. Food-risk scoring is paused so you can focus on safety first.",
    explicitIngredients: [],
    inferredIngredients: [],
    unknownIngredients: [],
    fodmapAnalysis: {
      load: "Unknown",
      groupsPresent: [],
      stackingConcern: "",
      flags: [],
    },
    nonFodmapFactors: [],
    portionAnalysis: {
      portionRisk: "Unknown",
      portionExplanation: "",
      portionInformationMissing: true,
    },
    cookingMethodAnalysis: [],
    personalAnalysis: {
      toleranceSignals: [],
      possibleTriggerPatterns: [],
      similarPastMeals: [],
      dataQuality: "Low",
    },
    scoreBreakdown: {
      baseIngredientScore: 0,
      stackingScore: 0,
      portionScore: 0,
      nonFodmapScore: 0,
      personalPatternScore: 0,
      currentContextScore: 0,
      protectiveAdjustment: 0,
      finalScore: 0,
    },
    possibleSymptoms: [],
    protectiveFactors: [],
    saferAlternatives: [],
    counterfactualAnalysis: {
      suggestedChanges: [],
      estimatedAdjustedScore: null,
    },
    missingInformation: [],
    assumptions: [],
    followUpQuestions: [],
    recommendation:
      "Please consider contacting a qualified healthcare professional promptly, especially if symptoms are severe, worsening, or new for you.",
    safetyMessage:
      "Some of the wording you entered may suggest urgent symptoms such as bleeding, severe pain, repeated vomiting, fever, dehydration, or unexplained weight loss. These deserve prompt professional assessment rather than food analysis alone.",
    disclaimer: MEAL_ANALYSIS_DISCLAIMER,
    scoringExplanation: "Safety red-flag check triggered before food analysis.",
    fodmapFlags: [],
    possibleTriggers: [],
    positiveFactors: [],
    portionConsiderations: [],
    personalPattern: "",
    metadata: {
      deepseekCalled: false,
      analysisSource: "rules",
      rulesVersion: "safety",
    },
  };
}
