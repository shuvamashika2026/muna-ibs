import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateExperiment,
  type Experiment,
  type ExperimentCheckin,
  type ExperimentTargetType,
} from "@/lib/experiment-engine";
import { mapExperimentConfidence } from "@/lib/mios/confidence";
import type { MiosEvidenceItem } from "@/lib/mios/types";
import { MIOS_SOURCE_LABELS } from "@/lib/mios/types";

function mapExperimentRow(row: Record<string, unknown>): Experiment {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    target_label: String(row.target_label),
    target_type: row.target_type as ExperimentTargetType,
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

export async function fetchExperimentEvidenceForMios(
  supabase: SupabaseClient | null,
  userId: string | undefined
): Promise<MiosEvidenceItem[]> {
  if (!supabase || !userId) {
    return [];
  }

  const activeResult = await supabase
    .from("experiments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  let experimentRow = (activeResult.data as Record<string, unknown> | null) ?? null;

  if (!experimentRow) {
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
    return [];
  }

  const experiment = mapExperimentRow(experimentRow);
  if (experiment.status !== "active" && experiment.status !== "completed") {
    return [];
  }

  const { data: checkinRows } = await supabase
    .from("experiment_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("experiment_id", experiment.id)
    .order("checkin_date", { ascending: true });

  const checkins = ((checkinRows ?? []) as Record<string, unknown>[]).map(mapCheckinRow);

  if (experiment.status === "active") {
    const activeItem: MiosEvidenceItem = {
      id: `experiment-active-${experiment.id}`,
      source: "experiment",
      title: `${experiment.target_label} experiment in progress`,
      summary: `Active ${experiment.target_type.replaceAll("_", " ")} experiment with ${checkins.length} check-in(s) logged so far. Observations are incomplete and do not establish causation.`,
      confidence: checkins.length >= 2 ? "limited" : "unavailable",
      relevance: "high",
      limitations: ["Experiment still active; no final evaluation."],
      sourceLabel: MIOS_SOURCE_LABELS.experiment,
      isAvailable: checkins.length > 0,
      topics: [experiment.target_label.toLowerCase()],
    };
    return activeItem.isAvailable ? [activeItem] : [];
  }

  const evaluation = evaluateExperiment({ experiment, checkins });
  if (!evaluation.dataSufficient && evaluation.observations.length === 0) {
    return [];
  }

  const confidence = evaluation.confidence ? mapExperimentConfidence(evaluation.confidence) : "unavailable";

  const completedItem: MiosEvidenceItem = {
    id: `experiment-completed-${experiment.id}`,
    source: "experiment",
    title: `${experiment.target_label} experiment observations`,
    summary: [
      evaluation.observations.slice(0, 3).join(" "),
      evaluation.interpretation,
    ]
      .filter(Boolean)
      .join(" "),
    confidence,
    relevance: "high",
    limitations: ["Personal experiment observations only; does not prove causation."],
    sourceLabel: MIOS_SOURCE_LABELS.experiment,
    isAvailable: evaluation.dataSufficient || evaluation.observations.length > 0,
    topics: [experiment.target_label.toLowerCase()],
  };

  return completedItem.isAvailable ? [completedItem] : [];
}
