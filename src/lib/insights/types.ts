import type { Experiment, ExperimentCheckin } from "@/lib/experiment-engine";

export type InsightType =
  | "food"
  | "hydration"
  | "sleep"
  | "stress"
  | "bowel"
  | "experiment"
  | "overall";

export type InsightConfidence = "higher" | "moderate" | "limited" | "unavailable";

export type InsightStatus = "active" | "insufficient_data" | "blocked" | "stale";

export type MunaInsight = {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  confidence: InsightConfidence;
  evidenceCount: number;
  observationWindowDays: number;
  supportingEvidence: string[];
  limitations: string[];
  generatedAt: string;
  expiresAt: string;
  status: InsightStatus;
  isActionable: boolean;
  suggestedNextStep: string | null;
};

export type MunaInsightsInput = {
  meals: Record<string, unknown>[];
  symptoms: Record<string, unknown>[];
  water: Record<string, unknown>[];
  sleep: Record<string, unknown>[];
  bowel: Record<string, unknown>[];
  profile: Record<string, unknown> | null;
  experiment?: {
    experiment: Experiment;
    checkins: ExperimentCheckin[];
  } | null;
  generatedAt: string;
  observationWindowDays?: number;
};

export type MunaInsightsInternalSummary = {
  insightCountsByType: Record<InsightType, number>;
  confidenceDistribution: Record<InsightConfidence, number>;
  unavailableDomains: InsightType[];
  blockedCount: number;
};

export type MunaInsightsOutput = {
  allInsights: MunaInsight[];
  activeInsights: MunaInsight[];
  actionableInsights: MunaInsight[];
  overallInsight: MunaInsight | null;
  unavailableDomains: InsightType[];
  internalSummary: MunaInsightsInternalSummary;
};

export const DEFAULT_OBSERVATION_WINDOW_DAYS = 14;
export const INSIGHT_TTL_MS = 24 * 60 * 60 * 1000;

export const ASSOCIATION_LIMITATION =
  "This describes a possible association in your logs, not proof of causation.";
export const NO_DIAGNOSIS_LIMITATION = "This is not a diagnosis or medical recommendation.";
export const LOGGING_LIMITATION = "Confidence reflects logging volume and consistency, not clinical certainty.";

export function createInsight(
  partial: Omit<MunaInsight, "generatedAt" | "expiresAt"> & {
    generatedAt: string;
    ttlMs?: number;
  }
): MunaInsight {
  const ttlMs = partial.ttlMs ?? INSIGHT_TTL_MS;
  const generatedAtMs = Date.parse(partial.generatedAt);
  const expiresAt = Number.isFinite(generatedAtMs)
    ? new Date(generatedAtMs + ttlMs).toISOString()
    : new Date(Date.now() + ttlMs).toISOString();

  const rest = { ...partial };
  delete rest.ttlMs;

  return {
    ...rest,
    limitations: [...new Set([...rest.limitations, NO_DIAGNOSIS_LIMITATION, LOGGING_LIMITATION])],
    generatedAt: partial.generatedAt,
    expiresAt,
  };
}

export function numberFrom(row: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

export function textFrom(row: Record<string, unknown> | undefined, keys: string[]): string | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

export function getDateFromRow(row: Record<string, unknown>): string | null {
  const keys = [
    "symptom_date",
    "logged_at",
    "created_at",
    "meal_date",
    "eaten_at",
    "sleep_date",
    "slept_on",
    "log_date",
    "logged_on",
    "checkin_date",
  ];
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length >= 10) {
      return value.slice(0, 10);
    }
  }
  return null;
}

export function addDaysToDate(date: string, days: number): string | null {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return null;
  const next = new Date(parsed);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function averageNumbers(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function waterLitersFromRow(row: Record<string, unknown> | undefined): number | null {
  if (!row) return null;
  const amountMl = numberFrom(row, ["amount_ml"]);
  if (amountMl !== null) return amountMl / 1000;
  const cups = numberFrom(row, ["cups"]);
  if (cups !== null) return cups * 0.25;
  const liters = numberFrom(row, ["liters", "amount_liters", "water_liters"]);
  if (liters !== null) return liters;
  return null;
}

export function waterGoalFromProfile(profile: Record<string, unknown> | null): number {
  const goalLiters = profile ? numberFrom(profile, ["water_goal_liters", "daily_water_goal_liters"]) : null;
  if (goalLiters !== null && goalLiters > 0) return goalLiters;
  const goalMl = profile ? numberFrom(profile, ["water_goal_ml", "daily_water_goal_ml"]) : null;
  if (goalMl !== null && goalMl > 0) return goalMl / 1000;
  return 1.8;
}

export function filterRowsWithinWindow(
  rows: Record<string, unknown>[],
  generatedAt: string,
  windowDays: number
): Record<string, unknown>[] {
  const endMs = Date.parse(generatedAt);
  if (!Number.isFinite(endMs)) return rows;
  const startMs = endMs - windowDays * 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    const date = getDateFromRow(row);
    if (!date) return true;
    const rowMs = Date.parse(`${date}T12:00:00Z`);
    return Number.isFinite(rowMs) && rowMs >= startMs && rowMs <= endMs;
  });
}

export function symptomSeverity(row: Record<string, unknown>): number | null {
  const pain = numberFrom(row, ["pain_level", "severity", "pain"]);
  const bloating = numberFrom(row, ["bloating_level", "bloating"]);
  const values = [pain, bloating].filter((value): value is number => value !== null);
  if (!values.length) return null;
  return Math.max(...values);
}

export function isSymptomHeavy(row: Record<string, unknown>): boolean {
  const severity = symptomSeverity(row);
  return severity !== null && severity >= 4;
}

export function containsCausationLanguage(text: string): boolean {
  return /\b(caused|causes|proved|proven|triggered|definitely|guarantee)\b/i.test(text);
}
