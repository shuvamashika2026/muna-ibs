import { NextResponse } from "next/server";
import {
  evaluateExperiment,
  type Experiment,
  type ExperimentCheckin,
  type ExperimentEvaluation,
  type ExperimentTargetType,
} from "@/lib/experiment-engine";
import { getExperimentProgress } from "@/lib/experiment-progress";
import {
  EXPERIMENT_SAFETY_STATEMENT,
  mapAdherenceToStoredValue,
  validateExperimentProposal,
  type AdherenceChoice,
} from "@/lib/experiment-safety";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authenticateSupabaseRequest,
  mapAuthFailureToStatus,
} from "@/lib/supabase/request-auth";

type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
};

async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) {
    const status = mapAuthFailureToStatus(auth.reason);
    const message =
      auth.reason === "not_configured"
        ? "Supabase is not configured."
        : "Authentication required.";
    return NextResponse.json({ error: message }, { status });
  }

  return { supabase: auth.supabase, userId: auth.userId };
}

function rejectClientSuppliedUserId(body: Record<string, unknown>): NextResponse | null {
  if (body.user_id !== undefined || body.userId !== undefined) {
    return NextResponse.json(
      { error: "Client-supplied user identifiers are not accepted." },
      { status: 400 }
    );
  }

  return null;
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
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
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
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function isDurationDays(value: number): value is 3 | 5 | 7 {
  return value === 3 || value === 5 || value === 7;
}

function isTargetType(value: string): value is ExperimentTargetType {
  return value === "food_reduction" || value === "food_reintroduction" || value === "habit";
}

function isAdherenceChoice(value: string): value is AdherenceChoice {
  return value === "yes" || value === "partly" || value === "no";
}

function severityOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 10) return null;
  return Math.round(numeric);
}

async function fetchExperimentBundle(supabase: AuthContext["supabase"], userId: string, experimentId?: string) {
  let experimentRows: Record<string, unknown> | null = null;
  let experimentError: { message: string } | null = null;

  if (experimentId) {
    const result = await supabase
      .from("experiments")
      .select("*")
      .eq("user_id", userId)
      .eq("id", experimentId)
      .maybeSingle();
    experimentRows = (result.data as Record<string, unknown> | null) ?? null;
    experimentError = result.error;
  } else {
    const activeResult = await supabase
      .from("experiments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (activeResult.error) {
      experimentError = activeResult.error;
    } else if (activeResult.data) {
      experimentRows = activeResult.data as Record<string, unknown>;
    } else {
      const completedResult = await supabase
        .from("experiments")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      experimentRows = (completedResult.data as Record<string, unknown> | null) ?? null;
      experimentError = completedResult.error;
    }
  }

  if (experimentError) {
    return { error: experimentError.message };
  }

  if (!experimentRows) {
    return { experiment: null, checkins: [], evaluation: null, progress: null };
  }

  const experiment = mapExperimentRow(experimentRows as Record<string, unknown>);
  const { data: checkinRows, error: checkinError } = await supabase
    .from("experiment_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("experiment_id", experiment.id)
    .order("checkin_date", { ascending: true });

  if (checkinError) {
    return { error: checkinError.message };
  }

  const checkins = ((checkinRows ?? []) as Record<string, unknown>[]).map(mapCheckinRow);
  const progress = getExperimentProgress(experiment, checkins);
  const evaluation =
    experiment.status === "completed" ? evaluateExperiment({ experiment, checkins }) : null;

  return { experiment, checkins, evaluation, progress };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const bundle = await fetchExperimentBundle(auth.supabase, auth.userId);
  if ("error" in bundle && bundle.error) {
    return NextResponse.json({ error: bundle.error }, { status: 500 });
  }

  return NextResponse.json({
    safetyStatement: EXPERIMENT_SAFETY_STATEMENT,
    experiment: bundle.experiment,
    checkins: bundle.checkins,
    progress: bundle.progress,
    evaluation: bundle.evaluation,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientUserIdRejection = rejectClientSuppliedUserId(body);
  if (clientUserIdRejection) {
    return clientUserIdRejection;
  }

  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "create") {
    const targetType = typeof body.target_type === "string" ? body.target_type : "";
    const targetLabel = typeof body.target_label === "string" ? body.target_label.trim() : "";
    const hypothesis = typeof body.hypothesis === "string" ? body.hypothesis.trim() : "";
    const durationDays = Number(body.duration_days);
    const startDate = typeof body.start_date === "string" ? body.start_date.slice(0, 10) : "";
    const safetyAcknowledged = body.safety_acknowledged === true;

    if (!safetyAcknowledged) {
      return NextResponse.json({ error: "Please acknowledge the safety statement before starting." }, { status: 400 });
    }

    if (!isTargetType(targetType)) {
      return NextResponse.json({ error: "Choose a valid experiment type." }, { status: 400 });
    }

    if (!isDurationDays(durationDays)) {
      return NextResponse.json({ error: "Duration must be 3, 5, or 7 days." }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "Choose a valid start date." }, { status: 400 });
    }

    const validation = validateExperimentProposal({
      target_type: targetType,
      target_label: targetLabel,
      hypothesis,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
    }

    const { data: activeExperiment } = await auth.supabase
      .from("experiments")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("status", "active")
      .maybeSingle();

    if (activeExperiment) {
      return NextResponse.json(
        { error: "You already have an active experiment. Complete or stop it before starting another." },
        { status: 409 }
      );
    }

    const { data, error } = await auth.supabase
      .from("experiments")
      .insert({
        user_id: auth.userId,
        target_label: targetLabel,
        target_type: targetType,
        hypothesis: hypothesis || null,
        start_date: startDate,
        duration_days: durationDays,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const experiment = mapExperimentRow(data as Record<string, unknown>);
    const progress = getExperimentProgress(experiment, []);

    return NextResponse.json({ experiment, checkins: [], progress, evaluation: null });
  }

  if (action === "checkin") {
    const experimentId = typeof body.experiment_id === "string" ? body.experiment_id : "";
    const adherence = typeof body.adherence === "string" ? body.adherence : "";
    const checkinDate =
      typeof body.checkin_date === "string" ? body.checkin_date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!experimentId) {
      return NextResponse.json({ error: "Experiment id is required." }, { status: 400 });
    }

    if (!isAdherenceChoice(adherence)) {
      return NextResponse.json({ error: "Choose whether you followed the plan: yes, partly, or no." }, { status: 400 });
    }

    const { data: experimentRow, error: experimentError } = await auth.supabase
      .from("experiments")
      .select("*")
      .eq("id", experimentId)
      .eq("user_id", auth.userId)
      .eq("status", "active")
      .maybeSingle();

    if (experimentError || !experimentRow) {
      return NextResponse.json({ error: "Active experiment not found." }, { status: 404 });
    }

    const mappedAdherence = mapAdherenceToStoredValue(adherence);
    const combinedNotes = [mappedAdherence.notePrefix, notes].filter(Boolean).join(" ");

    const { error: checkinError } = await auth.supabase.from("experiment_checkins").upsert(
      {
        experiment_id: experimentId,
        user_id: auth.userId,
        checkin_date: checkinDate,
        adhered: mappedAdherence.adhered,
        symptom_severity: severityOrNull(body.symptom_severity),
        bloating_severity: severityOrNull(body.bloating_severity),
        stress_level: severityOrNull(body.stress_level),
        notes: combinedNotes || null,
      },
      { onConflict: "experiment_id,checkin_date" }
    );

    if (checkinError) {
      return NextResponse.json({ error: checkinError.message }, { status: 500 });
    }

    const bundle = await fetchExperimentBundle(auth.supabase, auth.userId, experimentId);
    if ("error" in bundle && bundle.error) {
      return NextResponse.json({ error: bundle.error }, { status: 500 });
    }

    return NextResponse.json(bundle);
  }

  if (action === "complete") {
    const experimentId = typeof body.experiment_id === "string" ? body.experiment_id : "";
    if (!experimentId) {
      return NextResponse.json({ error: "Experiment id is required." }, { status: 400 });
    }

    const { data: experimentRow, error: experimentError } = await auth.supabase
      .from("experiments")
      .select("*")
      .eq("id", experimentId)
      .eq("user_id", auth.userId)
      .in("status", ["active", "completed"])
      .maybeSingle();

    if (experimentError || !experimentRow) {
      return NextResponse.json({ error: "Experiment not found." }, { status: 404 });
    }

    if (experimentRow.status !== "completed") {
      const { error: updateError } = await auth.supabase
        .from("experiments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", experimentId)
        .eq("user_id", auth.userId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    const bundle = await fetchExperimentBundle(auth.supabase, auth.userId, experimentId);
    if ("error" in bundle && bundle.error) {
      return NextResponse.json({ error: bundle.error }, { status: 500 });
    }

    const evaluation: ExperimentEvaluation = evaluateExperiment({
      experiment: { ...bundle.experiment!, status: "completed" },
      checkins: bundle.checkins ?? [],
    });

    return NextResponse.json({ ...bundle, evaluation });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
