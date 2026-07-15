import type { InsightConfidence, MunaInsight } from "@/lib/insights/types";

export const MTI_SOURCE_VERSION = "mti-v1";
export const TIMELINE_EVENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type TimelineEventType =
  | "food_pattern"
  | "hydration_pattern"
  | "sleep_pattern"
  | "stress_pattern"
  | "bowel_pattern"
  | "symptom_change"
  | "experiment_started"
  | "experiment_completed"
  | "experiment_updated"
  | "overall_improvement"
  | "overall_worsening"
  | "tracking_milestone"
  | "weekly_summary"
  | "monthly_summary";

export type TimelineEventStatus = "active" | "superseded" | "stale";

export type InsightWithKey = MunaInsight & {
  insightKey: string;
};

export type MunaTimelineEvent = {
  eventKey: string;
  eventType: TimelineEventType;
  title: string;
  summary: string;
  confidence: InsightConfidence;
  linkedInsightKey: string;
  supportingEventIds: string[];
  status: TimelineEventStatus;
  generatedAt: string;
  expiresAt: string;
};

export type TimelineSummaryCounts = Record<TimelineEventType, number> & {
  total: number;
  active: number;
};

export type TimelineGenerationInput = {
  insights: MunaInsight[];
  generatedAt?: string;
};

export type TimelineGenerationOutput = {
  allEvents: MunaTimelineEvent[];
  activeTimeline: MunaTimelineEvent[];
  summaryCounts: TimelineSummaryCounts;
};

export type MunaEventRow = {
  id: string;
  user_id: string;
  event_key: string;
  event_type: TimelineEventType;
  title: string;
  summary: string;
  confidence: InsightConfidence;
  linked_insight_key: string;
  supporting_event_ids: string[];
  status: TimelineEventStatus;
  generated_at: string;
  expires_at: string;
  source_version: string;
  created_at: string;
  updated_at: string;
};

export const TIMELINE_SAFETY_LIMITATION =
  "This timeline note summarizes logged observations only. It is educational tracking support, not medical advice.";

export const NO_CAUSATION_LIMITATION =
  "Timeline events describe possible associations in your logs, not confirmed triggers.";

export function createEmptySummaryCounts(): TimelineSummaryCounts {
  return {
    food_pattern: 0,
    hydration_pattern: 0,
    sleep_pattern: 0,
    stress_pattern: 0,
    bowel_pattern: 0,
    symptom_change: 0,
    experiment_started: 0,
    experiment_completed: 0,
    experiment_updated: 0,
    overall_improvement: 0,
    overall_worsening: 0,
    tracking_milestone: 0,
    weekly_summary: 0,
    monthly_summary: 0,
    total: 0,
    active: 0,
  };
}

export function buildSummaryCounts(events: MunaTimelineEvent[]): TimelineSummaryCounts {
  const counts = createEmptySummaryCounts();
  for (const event of events) {
    counts[event.eventType] += 1;
    counts.total += 1;
    if (event.status === "active") {
      counts.active += 1;
    }
  }
  return counts;
}

export function containsDiagnosisLanguage(text: string): boolean {
  return /\b(you have ibs|confirmed condition|prescribed|prescription for|diagnosed with)\b/i.test(text);
}

export function containsCausationLanguage(text: string): boolean {
  return /\b(caused by|causes your|proved trigger|proven trigger|definitely caused|guarantee|because of this food)\b/i.test(
    text
  );
}

export function containsRawLogLanguage(text: string): boolean {
  return (
    /\b(user_id|meal_date|symptom_date|created_at|logged_at)\b/i.test(text) ||
    text.includes('"foods"') ||
    text.includes('"symptoms"') ||
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(text)
  );
}

export function createTimelineEvent(
  partial: Omit<MunaTimelineEvent, "generatedAt" | "expiresAt" | "status" | "supportingEventIds"> & {
    generatedAt: string;
    status?: TimelineEventStatus;
    supportingEventIds?: string[];
    ttlMs?: number;
  }
): MunaTimelineEvent {
  const ttlMs = partial.ttlMs ?? TIMELINE_EVENT_TTL_MS;
  const generatedAtMs = Date.parse(partial.generatedAt);
  const expiresAt = Number.isFinite(generatedAtMs)
    ? new Date(generatedAtMs + ttlMs).toISOString()
    : new Date(Date.now() + ttlMs).toISOString();

  const rest = { ...partial };
  delete rest.ttlMs;

  return {
    ...rest,
    supportingEventIds: rest.supportingEventIds ?? [],
    status: rest.status ?? "active",
    generatedAt: partial.generatedAt,
    expiresAt,
  };
}

export function isEligibleInsightForTimeline(insight: MunaInsight): boolean {
  if (insight.status === "blocked" || insight.status === "insufficient_data") {
    return false;
  }
  if (insight.confidence === "unavailable") {
    return false;
  }
  return true;
}

export function attachInsightKeys(insights: MunaInsight[], deriveInsightKey: (insight: MunaInsight) => string): InsightWithKey[] {
  return insights.map((insight) => ({
    ...insight,
    insightKey: deriveInsightKey(insight),
  }));
}
