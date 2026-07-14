import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experiment, ExperimentCheckin } from "@/lib/experiment-engine";
import {
  DEFAULT_OBSERVATION_WINDOW_DAYS,
  type MunaInsightsInput,
} from "@/lib/insights/types";

const MAX_OBSERVATION_WINDOW_DAYS = 30;

async function safeSelect(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  limit = 100
): Promise<{ rows: Record<string, unknown>[]; unavailable: boolean }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return { rows: [], unavailable: true };
    }

    return { rows: (data ?? []) as Record<string, unknown>[], unavailable: false };
  } catch {
    return { rows: [], unavailable: true };
  }
}

function getDateFromRow(row: Record<string, unknown>): string | null {
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

function filterRowsWithinWindow(
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

function mapExperimentRow(row: Record<string, unknown>): Experiment {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    target_label: String(row.target_label),
    target_type: row.target_type as Experiment["target_type"],
    hypothesis: typeof row.hypothesis === "string" ? row.hypothesis : null,
    start_date: String(row.start_date).slice(0, 10),
    duration_days: Number(row.duration_days) as Experiment["duration_days"],
    status: row.status as Experiment["status"],
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

function mapCheckinRow(row: Record<string, unknown>): ExperimentCheckin {
  return {
    id: String(row.id),
    experiment_id: String(row.experiment_id),
    user_id: String(row.user_id),
    checkin_date: String(row.checkin_date).slice(0, 10),
    adhered: typeof row.adhered === "boolean" ? row.adhered : null,
    symptom_severity: row.symptom_severity === null ? null : Number(row.symptom_severity),
    bloating_severity: row.bloating_severity === null ? null : Number(row.bloating_severity),
    stress_level: row.stress_level === null ? null : Number(row.stress_level),
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

async function fetchExperimentBundle(
  supabase: SupabaseClient,
  userId: string
): Promise<{ experiment: Experiment; checkins: ExperimentCheckin[] } | null> {
  try {
    const activeResult = await supabase
      .from("experiments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    let experimentRow = (activeResult.data as Record<string, unknown> | null) ?? null;

    if (!experimentRow && !activeResult.error) {
      const completedResult = await supabase
        .from("experiments")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      experimentRow = (completedResult.data as Record<string, unknown> | null) ?? null;
    }

    if (!experimentRow) {
      return null;
    }

    const experiment = mapExperimentRow(experimentRow);
    const { data: checkinRows } = await supabase
      .from("experiment_checkins")
      .select("*")
      .eq("user_id", userId)
      .eq("experiment_id", experiment.id)
      .order("checkin_date", { ascending: true });

    return {
      experiment,
      checkins: ((checkinRows ?? []) as Record<string, unknown>[]).map(mapCheckinRow),
    };
  } catch {
    return null;
  }
}

export function clampObservationWindowDays(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_OBSERVATION_WINDOW_DAYS;
  }
  return Math.max(1, Math.min(MAX_OBSERVATION_WINDOW_DAYS, Math.round(value)));
}

export type FetchMieInputResult = {
  input: MunaInsightsInput;
  unavailableTables: string[];
};

export async function fetchMieInput(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    generatedAt?: string;
    observationWindowDays?: number;
  }
): Promise<FetchMieInputResult> {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const observationWindowDays = clampObservationWindowDays(options?.observationWindowDays);
  const unavailableTables: string[] = [];

  const [profileResult, meals, water, sleep, symptoms, bowel] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    safeSelect(supabase, "meals", userId, 100),
    safeSelect(supabase, "water_logs", userId, 100),
    safeSelect(supabase, "sleep_logs", userId, 100),
    safeSelect(supabase, "symptoms", userId, 100),
    safeSelect(supabase, "bowel_movements", userId, 100),
  ]);

  if (profileResult.error) unavailableTables.push("profiles");
  if (meals.unavailable) unavailableTables.push("meals");
  if (water.unavailable) unavailableTables.push("water_logs");
  if (sleep.unavailable) unavailableTables.push("sleep_logs");
  if (symptoms.unavailable) unavailableTables.push("symptoms");
  if (bowel.unavailable) unavailableTables.push("bowel_movements");

  const experimentBundle = await fetchExperimentBundle(supabase, userId);
  if (experimentBundle === null) {
    unavailableTables.push("experiments");
  }

  const input: MunaInsightsInput = {
    meals: filterRowsWithinWindow(meals.rows, generatedAt, observationWindowDays),
    symptoms: filterRowsWithinWindow(symptoms.rows, generatedAt, observationWindowDays),
    water: filterRowsWithinWindow(water.rows, generatedAt, observationWindowDays),
    sleep: filterRowsWithinWindow(sleep.rows, generatedAt, observationWindowDays),
    bowel: filterRowsWithinWindow(bowel.rows, generatedAt, observationWindowDays),
    profile: (profileResult.data as Record<string, unknown> | null) ?? null,
    experiment: experimentBundle,
    generatedAt,
    observationWindowDays,
  };

  return { input, unavailableTables };
}
