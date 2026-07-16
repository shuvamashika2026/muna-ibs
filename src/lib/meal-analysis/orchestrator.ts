import type { SupabaseClient } from "@supabase/supabase-js";
import {
  analyzeMealWithDeepSeek,
  DEEPSEEK_MODEL,
  MealAnalysisModelError,
} from "@/lib/meal-analysis/deepseek";
import {
  applyDeepSeekScoreAdjustment,
  buildScoringExplanation,
} from "@/lib/meal-analysis/multi-factor-scoring";
import {
  runIntelligenceEngine,
  type IntelligenceEngineResult,
} from "@/lib/meal-analysis/intelligence-engine";
import { shouldUseDeepSeek } from "@/lib/meal-analysis/router";
import { RULES_ENGINE_VERSION } from "@/lib/meal-analysis/intelligence-engine";
import { consumeMealAnalysisQuota } from "@/lib/meal-analysis/storage";
import { buildSafetyOnlyAnalysis, detectMealSafetyRedFlags } from "@/lib/meal-analysis/safety";
import {
  MEAL_ANALYSIS_PROMPT_VERSION,
  MEAL_ANALYSIS_VERSION,
  buildMealInputSummary,
  riskLevelFromScore,
  type MealAnalysisInput,
  type MealAnalysisMetadata,
  type MealAnalysisResult,
} from "@/lib/meal-analysis/types";

const DAILY_MEAL_ANALYSIS_LIMIT = 10;

export type HybridAnalysisOptions = {
  supabase: SupabaseClient;
  userId: string;
  meal: MealAnalysisInput;
  force?: boolean;
};

export type HybridAnalysisOutcome = {
  analysis: MealAnalysisResult;
  deepseekUsed: boolean;
  metadata: MealAnalysisMetadata;
  notice?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
  };
};

export async function runHybridMealAnalysis(
  options: HybridAnalysisOptions
): Promise<HybridAnalysisOutcome> {
  const startedAt = Date.now();
  const mealSummary = buildMealInputSummary(options.meal);

  const safety = detectMealSafetyRedFlags(options.meal, mealSummary);
  if (safety.matched) {
    const analysis = buildSafetyOnlyAnalysis();
    return {
      analysis,
      deepseekUsed: false,
      metadata: analysis.metadata ?? {
        deepseekCalled: false,
        analysisSource: "rules",
        rulesVersion: "safety",
        durationMs: Date.now() - startedAt,
      },
    };
  }

  const engine = await runIntelligenceEngine(options.supabase, options.userId, options.meal);
  const wantsDeepSeek =
    Boolean(process.env.DEEPSEEK_API_KEY) && shouldUseDeepSeek(engine, options.meal, options.force);

  if (!wantsDeepSeek) {
    return finalizeLocalAnalysis(engine, startedAt);
  }

  const quota = await consumeMealAnalysisQuota(options.supabase, DAILY_MEAL_ANALYSIS_LIMIT);
  if (!quota?.allowed) {
    const outcome = finalizeLocalAnalysis(engine, startedAt);
    if (!quota) {
      outcome.analysis.summary = `${outcome.analysis.summary} AI reasoning is temporarily unavailable, so this result uses local guidance only.`;
      outcome.notice = "Could not verify AI usage quota. Showing local guidance.";
    } else {
      outcome.notice = "Daily AI meal analysis limit reached. Showing local guidance instead.";
      outcome.usage = {
        used: quota.used,
        limit: DAILY_MEAL_ANALYSIS_LIMIT,
        remaining: quota.remaining,
      };
    }
    return outcome;
  }

  try {
    const deepseekResult = await analyzeMealWithDeepSeek({
      meal: options.meal,
      engineResult: engine,
      baselineSummary: engine.baselineSummary,
      personalSummary: engine.personalSummary,
    });

    const analysis = mergeDeepSeekEnhancements(engine, deepseekResult, startedAt);

    return {
      analysis,
      deepseekUsed: true,
      metadata: analysis.metadata!,
      usage: {
        used: quota.used,
        limit: DAILY_MEAL_ANALYSIS_LIMIT,
        remaining: quota.remaining,
      },
    };
  } catch (error) {
    if (error instanceof MealAnalysisModelError) {
      const outcome = finalizeLocalAnalysis(engine, startedAt);
      outcome.analysis.summary = `${outcome.analysis.summary} AI reasoning was temporarily unavailable, so this result uses local guidance only.`;
      outcome.notice = error.message;
      if (quota) {
        outcome.usage = {
          used: quota.used,
          limit: DAILY_MEAL_ANALYSIS_LIMIT,
          remaining: quota.remaining,
        };
      }
      return outcome;
    }

    throw error;
  }
}

function finalizeLocalAnalysis(engine: IntelligenceEngineResult, startedAt: number): HybridAnalysisOutcome {
  const analysis: MealAnalysisResult = {
    ...engine.analysis,
    metadata: {
      ...engine.analysis.metadata,
      deepseekCalled: false,
      analysisSource: "rules",
      durationMs: Date.now() - startedAt,
    },
  };

  return {
    analysis,
    deepseekUsed: false,
    metadata: analysis.metadata!,
  };
}

function mergeDeepSeekEnhancements(
  engine: IntelligenceEngineResult,
  deepseek: MealAnalysisResult & {
    scoreAdjustmentReasons?: string[];
    suggestedScore?: number;
  },
  startedAt: number
): MealAnalysisResult {
  let scoreBreakdown = engine.scoreBreakdown;
  let scoringExplanation = engine.analysis.scoringExplanation ?? buildScoringExplanation(scoreBreakdown);

  if (typeof deepseek.suggestedScore === "number" && deepseek.scoreAdjustmentReasons?.length) {
    const adjusted = applyDeepSeekScoreAdjustment(
      scoreBreakdown,
      deepseek.suggestedScore,
      deepseek.scoreAdjustmentReasons
    );
    scoreBreakdown = adjusted.breakdown;
    scoringExplanation = `${buildScoringExplanation(scoreBreakdown)} AI refinement: ${adjusted.reasons.join("; ")}`;
  }

  const riskScore = scoreBreakdown.finalScore;
  const riskLevel = riskLevelFromScore(riskScore);

  return {
    ...engine.analysis,
    source: "hybrid",
    riskLevel,
    riskScore,
    confidence: deepseek.confidence ?? engine.analysis.confidence,
    headline: deepseek.headline || engine.analysis.headline,
    summary: deepseek.summary || engine.analysis.summary,
    recommendation: deepseek.recommendation || engine.analysis.recommendation,
    inferredIngredients: engine.analysis.inferredIngredients.length
      ? engine.analysis.inferredIngredients
      : deepseek.inferredIngredients,
    followUpQuestions: dedupeStrings([
      ...engine.analysis.followUpQuestions,
      ...deepseek.followUpQuestions,
    ]).slice(0, 2),
    assumptions: dedupeStrings([...engine.analysis.assumptions, ...deepseek.assumptions]).slice(0, 8),
    scoreBreakdown,
    scoringExplanation,
    metadata: {
      deepseekCalled: true,
      analysisSource: "hybrid",
      analysisVersion: MEAL_ANALYSIS_VERSION,
      rulesVersion: RULES_ENGINE_VERSION,
      modelName: deepseek.metadata?.modelName ?? DEEPSEEK_MODEL,
      promptVersion: MEAL_ANALYSIS_PROMPT_VERSION,
      inputTokens: deepseek.metadata?.inputTokens,
      outputTokens: deepseek.metadata?.outputTokens,
      durationMs: Date.now() - startedAt,
    },
  };
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export { MealAnalysisModelError };
