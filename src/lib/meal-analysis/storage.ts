import type { SupabaseClient } from "@supabase/supabase-js";
import { DEEPSEEK_MODEL } from "@/lib/meal-analysis/deepseek";
import {
  parseMealAnalysisPayload,
  type MealAnalysisResult,
} from "@/lib/meal-analysis/types";

export type StoredMealAnalysis = {
  id: string;
  mealId: string;
  analysis: MealAnalysisResult;
  modelProvider: string;
  modelName: string;
  updatedAt: string;
};

export async function fetchMealAnalysisForUser(
  supabase: SupabaseClient,
  userId: string,
  mealId: string
): Promise<StoredMealAnalysis | null> {
  const { data, error } = await supabase
    .from("meal_analyses")
    .select("id, meal_id, analysis, model_provider, model_name, updated_at")
    .eq("user_id", userId)
    .eq("meal_id", mealId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = parseMealAnalysisPayload(data.analysis);
  if (!parsed) {
    return null;
  }

  return {
    id: data.id,
    mealId: data.meal_id,
    analysis: parsed,
    modelProvider: data.model_provider,
    modelName: data.model_name,
    updatedAt: data.updated_at,
  };
}

export async function assertMealOwnedByUser(
  supabase: SupabaseClient,
  userId: string,
  mealId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("meals")
    .select("id")
    .eq("user_id", userId)
    .eq("id", mealId)
    .maybeSingle();

  return !error && Boolean(data?.id);
}

export async function upsertMealAnalysis(
  supabase: SupabaseClient,
  userId: string,
  mealId: string,
  analysis: MealAnalysisResult
): Promise<StoredMealAnalysis | null> {
  const modelProvider = analysis.metadata?.deepseekCalled ? "deepseek" : "local-rules";
  const modelName = analysis.metadata?.modelName ?? analysis.metadata?.rulesVersion ?? "local-rules-v1";

  const { data, error } = await supabase
    .from("meal_analyses")
    .upsert(
      {
        user_id: userId,
        meal_id: mealId,
        analysis,
        model_provider: modelProvider,
        model_name: modelName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "meal_id" }
    )
    .select("id, meal_id, analysis, model_provider, model_name, updated_at")
    .single();

  if (error || !data) {
    return null;
  }

  const parsed = parseMealAnalysisPayload(data.analysis);
  if (!parsed) {
    return null;
  }

  return {
    id: data.id,
    mealId: data.meal_id,
    analysis: parsed,
    modelProvider: data.model_provider,
    modelName: data.model_name,
    updatedAt: data.updated_at,
  };
}

export async function consumeMealAnalysisQuota(
  supabase: SupabaseClient,
  requestLimit: number
): Promise<{ allowed: boolean; used: number; remaining: number } | null> {
  const { data, error } = await supabase.rpc("use_daily_meal_analysis_request", {
    request_limit: requestLimit,
  });

  if (error) {
    return null;
  }

  const row = data?.[0];
  return {
    allowed: Boolean(row?.allowed),
    used: Number(row?.used ?? 0),
    remaining: Number(row?.remaining ?? 0),
  };
}

export { DEEPSEEK_MODEL };
