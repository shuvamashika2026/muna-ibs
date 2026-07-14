import type { MunaInsight, InsightType } from "@/lib/insights/types";

export const MIE_SOURCE_VERSION = "mie-v1";
export const MIE_REGENERATION_COOLDOWN_MS = 15 * 60 * 1000;

export type StoredInsightStatus =
  | "active"
  | "insufficient_data"
  | "blocked"
  | "stale"
  | "superseded";

export type UserSafeInsight = {
  insightKey: string;
  type: InsightType;
  title: string;
  summary: string;
  confidence: MunaInsight["confidence"];
  evidenceCount: number;
  observationWindowDays: number;
  supportingEvidence: string[];
  limitations: string[];
  generatedAt: string;
  expiresAt: string;
  status: StoredInsightStatus;
  isActionable: boolean;
  suggestedNextStep: string | null;
  blockedSafetyMarker: boolean;
};

export type MunaInsightRow = {
  id: string;
  user_id: string;
  insight_key: string;
  insight_type: InsightType;
  title: string;
  summary: string;
  confidence: MunaInsight["confidence"];
  evidence_count: number;
  observation_window_days: number;
  supporting_evidence: string[];
  limitations: string[];
  generated_at: string;
  expires_at: string;
  status: StoredInsightStatus;
  is_actionable: boolean;
  suggested_next_step: string | null;
  source_version: string;
  created_at: string;
  updated_at: string;
};

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export function deriveInsightKey(insight: MunaInsight): string {
  const id = insight.id;

  if (id === "overall-weekly-summary") return "overall:weekly";
  if (id === "food-insufficient-data") return "food:insufficient_data";
  if (id === "food-no-patterns") return "food:no_pattern";
  if (id === "hydration-no-data") return "hydration:no_data";
  if (id === "hydration-incomplete-logging") return "hydration:incomplete_logging";
  if (id === "hydration-below-goal") return "hydration:below_goal";
  if (id === "hydration-goal-met") return "hydration:goal_met";
  if (id === "hydration-mixed") return "hydration:mixed";
  if (id === "sleep-insufficient-data") return "sleep:insufficient_data";
  if (id === "sleep-trend") return "sleep:trend";
  if (id === "sleep-symptom-association") return "sleep:shorter_with_symptoms";
  if (id === "stress-insufficient-data") return "stress:insufficient_data";
  if (id === "stress-symptom-association") return "stress:higher_with_symptoms";
  if (id === "stress-mixed-relationship") return "stress:mixed_relationship";
  if (id === "stress-no-consistent-relationship") return "stress:no_consistent_relationship";
  if (id === "bowel-insufficient-data") return "bowel:insufficient_data";
  if (id === "bowel-blocked-red-flag") return "bowel:blocked_safety";
  if (id === "bowel-looser-trend") return "bowel:looser_trend";
  if (id === "bowel-harder-trend") return "bowel:harder_trend";
  if (id === "bowel-stable-types-3-4") return "bowel:stable_types_3_4";
  if (id === "bowel-urgency") return "bowel:urgency";
  if (id === "bowel-stable-pattern") return "bowel:stable_pattern";
  if (id === "experiment-none") return "experiment:none";

  const foodAssociation = id.match(/^food-(.+)-association$/);
  if (foodAssociation) return `food:${foodAssociation[1]}:possible_association`;

  const foodInsufficient = id.match(/^food-(.+)-insufficient$/);
  if (foodInsufficient) return `food:${foodInsufficient[1]}:insufficient_evidence`;

  const foodMixed = id.match(/^food-(.+)-mixed$/);
  if (foodMixed) return `food:${foodMixed[1]}:mixed_response`;

  const foodTolerated = id.match(/^food-(.+)-tolerated$/);
  if (foodTolerated) return `food:${foodTolerated[1]}:tolerated`;

  const experimentMatch = id.match(/^experiment-(?:active|completed|insufficient|blocked)-(.+)$/);
  if (experimentMatch) return `experiment:${experimentMatch[1]}:summary`;

  return `${insight.type}:${id.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
}

export function sanitizeSupportingEvidence(items: string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !looksLikeUnsafeEvidence(item))
    .map((item) =>
      item
        .replace(UUID_PATTERN, "[redacted]")
        .replace(EMAIL_PATTERN, "[redacted]")
        .slice(0, 240)
    )
    .slice(0, 8);
}

function looksLikeUnsafeEvidence(item: string): boolean {
  const trimmed = item.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return true;
  if (/\b(user_id|meal_date|symptom_date|created_at|raw)\b/i.test(item)) return true;
  if (item.includes('"foods"') || item.includes('"symptoms"')) return true;
  if (/\b(prompt|api key|password|authorization)\b/i.test(item)) return true;
  return false;
}

export function sanitizeSummaryForStorage(summary: string, status: StoredInsightStatus): string {
  if (status !== "blocked") {
    return summary.slice(0, 1200);
  }
  return summary.slice(0, 600);
}

export function mapInsightToUserSafe(row: MunaInsightRow): UserSafeInsight {
  return {
    insightKey: row.insight_key,
    type: row.insight_type,
    title: row.title,
    summary: row.summary,
    confidence: row.confidence,
    evidenceCount: row.evidence_count,
    observationWindowDays: row.observation_window_days,
    supportingEvidence: sanitizeSupportingEvidence(
      Array.isArray(row.supporting_evidence) ? row.supporting_evidence : []
    ),
    limitations: Array.isArray(row.limitations) ? row.limitations.slice(0, 8) : [],
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    status: row.status,
    isActionable: row.is_actionable,
    suggestedNextStep: row.suggested_next_step,
    blockedSafetyMarker: row.status === "blocked",
  };
}

export function insightToRow(input: {
  userId: string;
  insight: MunaInsight;
  insightKey: string;
  sourceVersion?: string;
}): Omit<MunaInsightRow, "id" | "created_at" | "updated_at"> {
  const status: StoredInsightStatus =
    input.insight.status === "blocked"
      ? "blocked"
      : input.insight.status === "insufficient_data"
        ? "insufficient_data"
        : "active";

  return {
    user_id: input.userId,
    insight_key: input.insightKey,
    insight_type: input.insight.type,
    title: input.insight.title.slice(0, 240),
    summary: sanitizeSummaryForStorage(input.insight.summary, status),
    confidence: input.insight.confidence,
    evidence_count: input.insight.evidenceCount,
    observation_window_days: input.insight.observationWindowDays,
    supporting_evidence: sanitizeSupportingEvidence(input.insight.supportingEvidence),
    limitations: input.insight.limitations.slice(0, 8),
    generated_at: input.insight.generatedAt,
    expires_at: input.insight.expiresAt,
    status,
    is_actionable: input.insight.isActionable,
    suggested_next_step: input.insight.suggestedNextStep,
    source_version: input.sourceVersion ?? MIE_SOURCE_VERSION,
  };
}

export function isCurrentInsightStatus(status: StoredInsightStatus): boolean {
  return status === "active" || status === "insufficient_data" || status === "blocked";
}

export function supportingEvidenceLooksSafe(items: string[]): boolean {
  return items.every(
    (item) =>
      !UUID_PATTERN.test(item) &&
      !EMAIL_PATTERN.test(item) &&
      !/\b(prompt|api key|password|authorization)\b/i.test(item) &&
      !item.includes("{") &&
      !item.includes("[object Object]")
  );
}
