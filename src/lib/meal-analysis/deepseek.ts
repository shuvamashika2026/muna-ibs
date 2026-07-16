import OpenAI from "openai";
import { extractJsonFromModelOutput } from "@/lib/response-engine/templates";
import type { IntelligenceEngineResult } from "@/lib/meal-analysis/intelligence-engine";
import {
  MEAL_ANALYSIS_DISCLAIMER,
  MEAL_ANALYSIS_PROMPT_VERSION,
  parseMealAnalysisPayload,
  buildMealInputSummary,
  type MealAnalysisInput,
  type MealAnalysisResult,
} from "@/lib/meal-analysis/types";

const DEEPSEEK_MODEL = "deepseek-v4-flash";
const MAX_TOKENS = 1400;

export class MealAnalysisModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MealAnalysisModelError";
  }
}

function createDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new MealAnalysisModelError("Meal analysis AI is not configured.");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

type DeepSeekChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
  extra_body?: {
    thinking?: {
      type?: "disabled" | "enabled";
    };
  };
};

export type DeepSeekMealAnalysisResult = MealAnalysisResult & {
  suggestedScore?: number;
  scoreAdjustmentReasons?: string[];
};

export async function analyzeMealWithDeepSeek(input: {
  meal: MealAnalysisInput;
  engineResult: IntelligenceEngineResult;
  personalSummary: string;
  baselineSummary: string;
}): Promise<DeepSeekMealAnalysisResult> {
  const mealSummary = buildMealInputSummary(input.meal);
  const { analysis, scoreBreakdown } = input.engineResult;

  const exampleJson = JSON.stringify(
    {
      headline: "This meal may be more challenging for some people with IBS.",
      summary: "Explanation combining general IBS knowledge and limited personal context.",
      confidence: "Moderate",
      recommendation: "Consider logging portion size and symptoms over the next day.",
      followUpQuestions: ["Did the curry contain onion or garlic?"],
      assumptions: ["Some ingredients were inferred from a typical recipe."],
      suggestedScore: 42,
      scoreAdjustmentReasons: ["Hidden restaurant sauce may add fructans beyond listed ingredients."],
      disclaimer: MEAL_ANALYSIS_DISCLAIMER,
    },
    null,
    2
  );

  const systemPrompt = [
    "You are MUNA IBS Digestive Intelligence. Return ONLY valid JSON.",
    "Use empathetic, non-judgemental language. Never say a food is bad, unsafe, or will cause a flare.",
    "Never diagnose. Never claim confirmed personal triggers unless repeated evidence is provided.",
    "Distinguish general IBS/FODMAP knowledge from the user's limited personal summary.",
    "Never replace the deterministic score freely. If you suggest a different score, provide scoreAdjustmentReasons.",
    "Suggested score adjustments must stay within ±10 of the deterministic finalScore unless reasons are very weak.",
    "Do not invent confirmed ingredients — inferred items remain uncertain.",
    "Required JSON fields:",
    exampleJson,
  ].join("\n");

  const userPrompt = [
    "Refine explanation for this meal. Do NOT recalculate the full score from scratch.",
    "",
    "Meal:",
    mealSummary,
    "",
    "Compact personal baseline (not full history):",
    input.baselineSummary,
    "",
    "Personal pattern summary:",
    input.personalSummary,
    "",
    "Deterministic intelligence result:",
    JSON.stringify({
      riskLevel: analysis.riskLevel,
      finalScore: scoreBreakdown.finalScore,
      scoreBreakdown,
      explicitIngredients: analysis.explicitIngredients,
      inferredIngredients: analysis.inferredIngredients,
      unknownIngredients: analysis.unknownIngredients,
      fodmapAnalysis: analysis.fodmapAnalysis,
      nonFodmapFactors: analysis.nonFodmapFactors,
      portionAnalysis: analysis.portionAnalysis,
      personalAnalysis: {
        toleranceSignals: analysis.personalAnalysis.toleranceSignals,
        possibleTriggerPatterns: analysis.personalAnalysis.possibleTriggerPatterns,
      },
      counterfactualAnalysis: analysis.counterfactualAnalysis,
      missingInformation: analysis.missingInformation,
    }),
    "",
    "Respond with JSON only.",
  ].join("\n");

  const client = createDeepSeekClient();
  const requestBody: DeepSeekChatParams = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: MAX_TOKENS,
    extra_body: {
      thinking: {
        type: "disabled",
      },
    },
  };

  let response: OpenAI.Chat.Completions.ChatCompletion;

  try {
    response = await client.chat.completions.create(requestBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek request failed.";
    throw new MealAnalysisModelError(message);
  }

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new MealAnalysisModelError("The analysis model returned an empty response.");
  }

  const parsedJson = extractJsonFromModelOutput(content);
  if (!parsedJson) {
    throw new MealAnalysisModelError("The analysis response was not valid JSON.");
  }

  const record = parsedJson as Record<string, unknown>;
  const validated = parseMealAnalysisPayload({
    ...analysis,
    ...record,
    source: "hybrid",
    riskScore: scoreBreakdown.finalScore,
    scoreBreakdown,
  });

  if (!validated) {
    throw new MealAnalysisModelError("The analysis response did not match the required format.");
  }

  return {
    ...validated,
    suggestedScore:
      typeof record.suggestedScore === "number" ? record.suggestedScore : scoreBreakdown.finalScore,
    scoreAdjustmentReasons: Array.isArray(record.scoreAdjustmentReasons)
      ? record.scoreAdjustmentReasons.filter((item): item is string => typeof item === "string")
      : [],
    metadata: {
      deepseekCalled: true,
      analysisSource: "hybrid",
      modelName: DEEPSEEK_MODEL,
      promptVersion: MEAL_ANALYSIS_PROMPT_VERSION,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    },
  };
}

export { DEEPSEEK_MODEL };
