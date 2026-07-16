import { z } from "zod";

export const MEAL_ANALYSIS_DISCLAIMER =
  "This analysis is for informational purposes and does not replace professional medical advice.";

export const MEAL_ANALYSIS_VERSION = "2.0.0";
export const MEAL_ANALYSIS_PROMPT_VERSION = "hybrid-v2";
export const INTELLIGENCE_RULES_VERSION = "2.0.0";
export const PERSONAL_PATTERN_VERSION = "1.1.0";

export const riskLevelSchema = z.enum(["Low", "Moderate", "High"]);
export const engineConfidenceSchema = z.enum(["Low", "Moderate", "High"]);
export const triggerConfidenceSchema = z.enum(["Low", "Moderate", "Higher"]);
export const analysisSourceSchema = z.enum(["rules", "deepseek", "hybrid"]);
export const ingredientSourceSchema = z.enum(["user_entered", "recipe_inference", "unknown"]);
export const ingredientConfidenceSchema = z.enum(["Low", "Moderate", "High"]);
export const portionRiskSchema = z.enum(["Low", "Moderate", "High", "Unknown"]);
export const fodmapLoadSchema = z.enum(["Low", "Moderate", "High", "Unknown"]);
export const toleranceStateSchema = z.enum([
  "Possibly well tolerated",
  "Mixed response",
  "Possible trigger pattern",
  "Insufficient data",
]);
export const associationStrengthSchema = z.enum(["Weak", "Possible", "Repeated"]);
export const impactSchema = z.enum(["Small", "Moderate", "Significant"]);

const ingredientEntrySchema = z.object({
  ingredient: z.string().min(1).max(200),
  source: ingredientSourceSchema,
  confidence: ingredientConfidenceSchema,
});

const fodmapAnalysisSchema = z.object({
  load: fodmapLoadSchema,
  groupsPresent: z.array(z.string().min(1).max(80)).max(12),
  stackingConcern: z.string().max(600),
  flags: z
    .array(
      z.object({
        ingredient: z.string().min(1).max(200),
        fodmapGroup: z.string().min(1).max(120),
        reason: z.string().min(1).max(400),
      })
    )
    .max(12),
});

const portionAnalysisSchema = z.object({
  portionRisk: portionRiskSchema,
  portionExplanation: z.string().max(600),
  portionInformationMissing: z.boolean(),
});

const scoreBreakdownSchema = z.object({
  baseIngredientScore: z.number().min(0).max(25),
  stackingScore: z.number().min(0).max(15),
  portionScore: z.number().min(0).max(15),
  nonFodmapScore: z.number().min(0).max(15),
  personalPatternScore: z.number().min(0).max(20),
  currentContextScore: z.number().min(0).max(10),
  protectiveAdjustment: z.number().min(-25).max(0),
  finalScore: z.number().min(0).max(100),
});

const personalAnalysisSchema = z.object({
  toleranceSignals: z
    .array(
      z.object({
        ingredient: z.string().min(1).max(200),
        state: toleranceStateSchema,
        observationCount: z.number().int().nonnegative(),
        summary: z.string().max(400),
      })
    )
    .max(12),
  possibleTriggerPatterns: z
    .array(
      z.object({
        ingredient: z.string().min(1).max(200),
        symptom: z.string().min(1).max(200),
        observationCount: z.number().int().nonnegative(),
        typicalDelay: z.string().max(120),
        associationStrength: associationStrengthSchema,
        confidence: engineConfidenceSchema,
      })
    )
    .max(12),
  similarPastMeals: z
    .array(
      z.object({
        summary: z.string().min(1).max(400),
        overlapIngredients: z.array(z.string()).max(12),
        symptomOutcome: z.string().max(300),
      })
    )
    .max(6),
  dataQuality: engineConfidenceSchema,
  baselineSummary: z.string().max(800).optional(),
});

const counterfactualAnalysisSchema = z.object({
  originalEstimatedScore: z.number().min(0).max(100).optional(),
  suggestedChanges: z
    .array(
      z.object({
        change: z.string().min(1).max(240),
        reason: z.string().min(1).max(400),
        estimatedImpact: impactSchema,
      })
    )
    .max(8),
  estimatedAdjustedScore: z.number().min(0).max(100).nullable(),
});

export const mealAnalysisMetadataSchema = z.object({
  deepseekCalled: z.boolean(),
  analysisSource: analysisSourceSchema,
  analysisVersion: z.string().optional(),
  foodKnowledgeVersion: z.string().optional(),
  rulesVersion: z.string().optional(),
  personalPatternVersion: z.string().optional(),
  modelName: z.string().optional(),
  promptVersion: z.string().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const mealAnalysisSchema = z.object({
  analysisVersion: z.string().min(1).max(40),
  source: analysisSourceSchema,
  riskLevel: riskLevelSchema,
  riskScore: z.number().min(0).max(100),
  confidence: engineConfidenceSchema,

  headline: z.string().min(1).max(240),
  summary: z.string().min(1).max(1200),

  explicitIngredients: z.array(ingredientEntrySchema).max(24),
  inferredIngredients: z.array(ingredientEntrySchema).max(24),
  unknownIngredients: z.array(ingredientEntrySchema).max(24),

  fodmapAnalysis: fodmapAnalysisSchema,
  nonFodmapFactors: z.array(z.string().min(1).max(240)).max(12),
  portionAnalysis: portionAnalysisSchema,
  cookingMethodAnalysis: z.array(z.string().min(1).max(240)).max(10),

  personalAnalysis: personalAnalysisSchema,

  scoreBreakdown: scoreBreakdownSchema,

  possibleSymptoms: z.array(z.string().min(1).max(240)).max(10),
  protectiveFactors: z.array(z.string().min(1).max(240)).max(10),
  saferAlternatives: z.array(z.string().min(1).max(240)).max(10),

  counterfactualAnalysis: counterfactualAnalysisSchema,

  missingInformation: z.array(z.string().min(1).max(240)).max(10),
  assumptions: z.array(z.string().min(1).max(240)).max(10),
  followUpQuestions: z.array(z.string().min(1).max(240)).max(4),

  recommendation: z.string().min(1).max(800),
  safetyMessage: z.string().max(800),
  disclaimer: z.string().min(1).max(400),

  scoringExplanation: z.string().max(1600).optional(),
  needsClarification: z.boolean().optional(),
  metadata: mealAnalysisMetadataSchema.optional(),

  // Legacy flat fields kept for cached v1 analyses and gradual migration
  fodmapFlags: z
    .array(
      z.object({
        ingredient: z.string(),
        fodmapGroup: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
  possibleTriggers: z
    .array(
      z.object({
        ingredient: z.string(),
        reason: z.string(),
        confidence: triggerConfidenceSchema,
      })
    )
    .optional(),
  positiveFactors: z.array(z.string()).optional(),
  portionConsiderations: z.array(z.string()).optional(),
  personalPattern: z.string().optional(),
});

export type MealAnalysisResult = z.infer<typeof mealAnalysisSchema>;
export type MealAnalysisMetadata = z.infer<typeof mealAnalysisMetadataSchema>;
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export type MealAnalysisInput = {
  mealType: string;
  mealName: string;
  ingredients: string;
  drinks: string;
  portionSize: string;
  locationType: string;
  cookingMethod: string;
  fodmapLevel: string;
  notes: string;
  tags: string[];
};

export type MealAnalysisApiResponse = {
  analysis: MealAnalysisResult;
  cached: boolean;
  deepseekUsed: boolean;
  mealId?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
  };
};

function migrateLegacyAnalysis(record: Record<string, unknown>): Record<string, unknown> {
  if (record.analysisVersion) {
    return record;
  }

  const fodmapFlags =
    (record.fodmapFlags as Array<{ ingredient: string; fodmapGroup: string; reason: string }>) ?? [];

  return {
    analysisVersion: "1.0.0",
    source: record.source ?? "deepseek",
    riskLevel: record.riskLevel ?? "Moderate",
    riskScore: record.riskScore ?? 50,
    confidence: record.confidence ?? "Moderate",
    headline: record.summary ? String(record.summary).slice(0, 200) : "Meal analysis",
    summary: record.summary ?? "",
    explicitIngredients: [],
    inferredIngredients: [],
    unknownIngredients: [],
    fodmapAnalysis: {
      load: "Unknown",
      groupsPresent: fodmapFlags.map((f) => f.fodmapGroup).filter(Boolean),
      stackingConcern: "",
      flags: fodmapFlags,
    },
    nonFodmapFactors: [],
    portionAnalysis: {
      portionRisk: "Unknown",
      portionExplanation: (record.portionConsiderations as string[])?.[0] ?? "",
      portionInformationMissing: true,
    },
    cookingMethodAnalysis: [],
    personalAnalysis: {
      toleranceSignals: [],
      possibleTriggerPatterns: [],
      similarPastMeals: [],
      dataQuality: "Low",
      baselineSummary: String(record.personalPattern ?? ""),
    },
    scoreBreakdown: {
      baseIngredientScore: 0,
      stackingScore: 0,
      portionScore: 0,
      nonFodmapScore: 0,
      personalPatternScore: 0,
      currentContextScore: 0,
      protectiveAdjustment: 0,
      finalScore: Number(record.riskScore ?? 0),
    },
    possibleSymptoms: record.possibleSymptoms ?? [],
    protectiveFactors: record.positiveFactors ?? [],
    saferAlternatives: record.saferAlternatives ?? [],
    counterfactualAnalysis: {
      suggestedChanges: [],
      estimatedAdjustedScore: null,
    },
    missingInformation: [],
    assumptions: [],
    followUpQuestions: [],
    recommendation: record.recommendation ?? "",
    safetyMessage: record.safetyMessage ?? "",
    disclaimer: record.disclaimer ?? MEAL_ANALYSIS_DISCLAIMER,
    scoringExplanation: record.scoringExplanation,
    metadata: record.metadata,
    fodmapFlags: record.fodmapFlags,
    possibleTriggers: record.possibleTriggers,
    positiveFactors: record.positiveFactors,
    portionConsiderations: record.portionConsiderations,
    personalPattern: record.personalPattern,
  };
}

export function parseMealAnalysisPayload(data: unknown): MealAnalysisResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const normalized = migrateLegacyAnalysis(data as Record<string, unknown>);
  const parsed = mealAnalysisSchema.safeParse(normalized);
  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    disclaimer: parsed.data.disclaimer.trim() || MEAL_ANALYSIS_DISCLAIMER,
  };
}

export function buildMealInputSummary(input: MealAnalysisInput): string {
  return [
    `Meal type: ${input.mealType}`,
    input.mealName ? `Meal name: ${input.mealName}` : "",
    input.ingredients ? `Ingredients: ${input.ingredients}` : "",
    input.drinks ? `Drinks: ${input.drinks}` : "",
    `Portion: ${input.portionSize}`,
    `Location: ${input.locationType}`,
    input.cookingMethod ? `Cooking method: ${input.cookingMethod}` : "",
    `Estimated FODMAP level: ${input.fodmapLevel}`,
    input.tags.length ? `Trigger tags selected: ${input.tags.join(", ")}` : "",
    input.notes ? `Notes: ${input.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function hasMealInputContent(input: MealAnalysisInput): boolean {
  return Boolean(
    input.mealName.trim() ||
      input.ingredients.trim() ||
      input.drinks.trim() ||
      input.notes.trim()
  );
}

export function riskLevelFromScore(score: number): "Low" | "Moderate" | "High" {
  if (score <= 33) return "Low";
  if (score <= 66) return "Moderate";
  return "High";
}

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
