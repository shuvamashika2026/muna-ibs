import type { SupabaseClient } from "@supabase/supabase-js";
import type { MunaInsight, InsightType } from "@/lib/insights/types";
import {
  deriveInsightKey,
  insightToRow,
  isCurrentInsightStatus,
  mapInsightToUserSafe,
  MIE_SOURCE_VERSION,
  sanitizeSupportingEvidence,
  type MunaInsightRow,
  type StoredInsightStatus,
  type UserSafeInsight,
} from "@/lib/insights/insight-keys";

export {
  deriveInsightKey,
  MIE_REGENERATION_COOLDOWN_MS,
  MIE_SOURCE_VERSION,
  supportingEvidenceLooksSafe,
  type UserSafeInsight,
} from "@/lib/insights/insight-keys";

const CURRENT_STATUSES: StoredInsightStatus[] = ["active", "insufficient_data", "blocked"];

export async function supersedePriorInsight(
  supabase: SupabaseClient,
  userId: string,
  insightKey: string,
  sourceVersion = MIE_SOURCE_VERSION
): Promise<void> {
  await supabase
    .from("muna_insights")
    .update({ status: "superseded", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("insight_key", insightKey)
    .eq("source_version", sourceVersion)
    .in("status", CURRENT_STATUSES);
}

export async function markExpiredInsightsStale(
  supabase: SupabaseClient,
  userId: string,
  nowIso = new Date().toISOString()
): Promise<void> {
  await supabase
    .from("muna_insights")
    .update({ status: "stale", updated_at: nowIso })
    .eq("user_id", userId)
    .in("status", CURRENT_STATUSES)
    .lt("expires_at", nowIso);
}

export async function saveGeneratedInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: MunaInsight[],
  sourceVersion = MIE_SOURCE_VERSION
): Promise<UserSafeInsight[]> {
  await markExpiredInsightsStale(supabase, userId);

  const saved: UserSafeInsight[] = [];

  for (const insight of insights) {
    const insightKey = deriveInsightKey(insight);
    await supersedePriorInsight(supabase, userId, insightKey, sourceVersion);

    const row = insightToRow({ userId, insight, insightKey, sourceVersion });
    const { data, error } = await supabase
      .from("muna_insights")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      continue;
    }

    saved.push(mapInsightToUserSafe(data as MunaInsightRow));
  }

  return saved;
}

export async function fetchActiveInsights(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    type?: InsightType;
    actionableOnly?: boolean;
    nowIso?: string;
    markStale?: boolean;
  }
): Promise<UserSafeInsight[]> {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  if (options?.markStale) {
    await markExpiredInsightsStale(supabase, userId, nowIso);
  }

  let query = supabase
    .from("muna_insights")
    .select("*")
    .eq("user_id", userId)
    .in("status", CURRENT_STATUSES)
    .gte("expires_at", nowIso)
    .order("generated_at", { ascending: false });

  if (options?.type) {
    query = query.eq("insight_type", options.type);
  }

  if (options?.actionableOnly) {
    query = query.eq("is_actionable", true);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return (data as MunaInsightRow[]).map(mapInsightToUserSafe);
}

export async function fetchLatestOverallInsight(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSafeInsight | null> {
  const insights = await fetchActiveInsights(supabase, userId, { type: "overall" });
  return insights.find((item) => item.insightKey === "overall:weekly") ?? insights[0] ?? null;
}

export async function fetchLatestGenerationTimestamp(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("muna_insights")
    .select("generated_at")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return typeof data?.generated_at === "string" ? data.generated_at : null;
}

export function buildRateLimitedResponseInsights(stored: UserSafeInsight[]): {
  activeInsights: UserSafeInsight[];
  actionableInsights: UserSafeInsight[];
  overallInsight: UserSafeInsight | null;
  generatedAt: string | null;
  rateLimited: true;
} {
  const activeInsights = stored.filter((item) => isCurrentInsightStatus(item.status));
  const actionableInsights = activeInsights.filter((item) => item.isActionable);
  const overallInsight = activeInsights.find((item) => item.type === "overall") ?? null;
  const generatedAt = activeInsights[0]?.generatedAt ?? null;

  return {
    activeInsights,
    actionableInsights,
    overallInsight,
    generatedAt,
    rateLimited: true,
  };
}

export function dedupeActiveInsightsByKey(insights: UserSafeInsight[]): UserSafeInsight[] {
  const seen = new Set<string>();
  const deduped: UserSafeInsight[] = [];
  for (const insight of insights) {
    if (seen.has(insight.insightKey)) continue;
    seen.add(insight.insightKey);
    deduped.push(insight);
  }
  return deduped;
}

export function assertNoRawHealthRecordsInEvidence(items: string[]): boolean {
  return sanitizeSupportingEvidence(items).every(
    (item) =>
      !/\b(user_id|meal_date|symptom_date|created_at|raw)\b/i.test(item) &&
      !item.includes('"foods"') &&
      !item.includes('"symptoms"')
  );
}
