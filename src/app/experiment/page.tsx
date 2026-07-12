"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { inputClass, labelClass, primaryButtonClass } from "@/components/form-card";
import { supabase } from "@/lib/supabase";
import type { Experiment, ExperimentCheckin, ExperimentEvaluation } from "@/lib/experiment-engine";
import type { ExperimentProgress } from "@/lib/experiment-progress";
import { EXPERIMENT_SAFETY_STATEMENT } from "@/lib/experiment-safety";

type ExperimentBundle = {
  experiment: Experiment | null;
  checkins: ExperimentCheckin[];
  progress: ExperimentProgress | null;
  evaluation: ExperimentEvaluation | null;
};

type AdherenceChoice = "yes" | "partly" | "no";

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function ExperimentPage() {
  const [bundle, setBundle] = useState<ExperimentBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetType, setTargetType] = useState<Experiment["target_type"]>("food_reduction");
  const [targetLabel, setTargetLabel] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [durationDays, setDurationDays] = useState<3 | 5 | 7>(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);

  const [adherence, setAdherence] = useState<AdherenceChoice>("yes");
  const [symptomSeverity, setSymptomSeverity] = useState(3);
  const [bloatingSeverity, setBloatingSeverity] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [checkinNotes, setCheckinNotes] = useState("");

  const loadBundle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!supabase) {
      setError("Supabase is not configured.");
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setError("Authentication required.");
      setIsLoading(false);
      return;
    }

    const response = await fetch("/api/experiments", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Could not load experiment data.");
      setIsLoading(false);
      return;
    }

    const payload = (await response.json()) as ExperimentBundle;
    setBundle(payload);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBundle();
  }, [loadBundle]);

  async function postAction(body: Record<string, unknown>) {
    setIsSubmitting(true);
    setError(null);

    const token = await getAccessToken();
    if (!token) {
      setError("Authentication required.");
      setIsSubmitting(false);
      return;
    }

    const response = await fetch("/api/experiments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as ExperimentBundle & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Request failed.");
      setIsSubmitting(false);
      return;
    }

    setBundle({
      experiment: payload.experiment ?? null,
      checkins: payload.checkins ?? [],
      progress: payload.progress ?? null,
      evaluation: payload.evaluation ?? null,
    });
    setIsSubmitting(false);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    await postAction({
      action: "create",
      target_type: targetType,
      target_label: targetLabel,
      hypothesis,
      duration_days: durationDays,
      start_date: startDate,
      safety_acknowledged: safetyAcknowledged,
    });
  }

  async function handleCheckin(event: FormEvent) {
    event.preventDefault();
    if (!bundle?.experiment) return;

    await postAction({
      action: "checkin",
      experiment_id: bundle.experiment.id,
      adherence,
      symptom_severity: symptomSeverity,
      bloating_severity: bloatingSeverity,
      stress_level: stressLevel,
      notes: checkinNotes,
    });
    setCheckinNotes("");
  }

  async function handleComplete() {
    if (!bundle?.experiment) return;
    await postAction({
      action: "complete",
      experiment_id: bundle.experiment.id,
    });
  }

  const experiment = bundle?.experiment;
  const progress = bundle?.progress;
  const evaluation = bundle?.evaluation;
  const isCompleted = experiment?.status === "completed";
  const isActive = experiment?.status === "active";

  return (
    <AppShell title="Experiment Mode" subtitle="One small observation at a time. Facts only, no causation claims.">
      {isLoading ? (
        <p className="text-sm font-semibold text-slate-600">Loading experiment…</p>
      ) : (
        <div className="space-y-5">
          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
              {error}
            </div>
          ) : null}

          {!experiment ? (
            <form onSubmit={handleCreate} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-[#0F172A]">Start a gentle experiment</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Test one food or habit over 3, 5, or 7 days. Log daily check-ins and review computed observations only.
              </p>

              <div className="mt-5 grid gap-4">
                <label className={labelClass}>
                  Experiment type
                  <select className={inputClass} value={targetType} onChange={(e) => setTargetType(e.target.value as Experiment["target_type"])}>
                    <option value="food_reduction">Food reduction</option>
                    <option value="food_reintroduction">Food reintroduction</option>
                    <option value="habit">Habit</option>
                  </select>
                </label>

                <label className={labelClass}>
                  Target label
                  <input
                    className={inputClass}
                    value={targetLabel}
                    onChange={(e) => setTargetLabel(e.target.value)}
                    placeholder="Example: onion at dinner"
                    required
                  />
                </label>

                <label className={labelClass}>
                  Optional hypothesis
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={hypothesis}
                    onChange={(e) => setHypothesis(e.target.value)}
                    placeholder="Example: I want to see whether one onion-free dinner feels calmer."
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Duration
                    <select
                      className={inputClass}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value) as 3 | 5 | 7)}
                    >
                      <option value={3}>3 days</option>
                      <option value={5}>5 days</option>
                      <option value={7}>7 days</option>
                    </select>
                  </label>

                  <label className={labelClass}>
                    Start date
                    <input
                      className={inputClass}
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                  {EXPERIMENT_SAFETY_STATEMENT}
                </div>

                <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={safetyAcknowledged}
                    onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                    required
                  />
                  <span>I understand this is gentle self-observation only.</span>
                </label>
              </div>

              <button type="submit" className={`${primaryButtonClass} mt-5`} disabled={isSubmitting}>
                {isSubmitting ? "Starting…" : "Start experiment"}
              </button>
            </form>
          ) : null}

          {experiment && progress ? (
            <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#0F172A]">{experiment.target_label}</h2>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-500">
                    {experiment.target_type.replaceAll("_", " ")} · {experiment.status}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#ECFDF5] px-4 py-3 text-center">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Progress</p>
                  <p className="mt-1 text-2xl font-black text-[#0F766E]">{progress.progressPercent}%</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Current day" value={`${progress.currentDay}/${progress.plannedDays}`} />
                <Metric label="Days remaining" value={String(progress.daysRemaining)} />
                <Metric label="Check-ins" value={String(progress.completedCheckIns)} />
                <Metric label="Status" value={experiment.status} />
              </div>
            </section>
          ) : null}

          {isActive ? (
            <form onSubmit={handleCheckin} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-[#0F172A]">Today&apos;s check-in</h3>

              <div className="mt-4 grid gap-4">
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">Followed plan</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(["yes", "partly", "no"] as AdherenceChoice[]).map((choice) => (
                      <label key={choice} className="flex items-center gap-2 rounded-xl bg-[#ECFDF5] px-4 py-3 text-sm font-semibold capitalize">
                        <input
                          type="radio"
                          name="adherence"
                          value={choice}
                          checked={adherence === choice}
                          onChange={() => setAdherence(choice)}
                        />
                        {choice}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <SliderField label="Symptom severity" value={symptomSeverity} onChange={setSymptomSeverity} />
                <SliderField label="Bloating severity" value={bloatingSeverity} onChange={setBloatingSeverity} />
                <SliderField label="Stress level" value={stressLevel} onChange={setStressLevel} />

                <label className={labelClass}>
                  Optional notes
                  <textarea className={inputClass} rows={3} value={checkinNotes} onChange={(e) => setCheckinNotes(e.target.value)} />
                </label>
              </div>

              <button type="submit" className={`${primaryButtonClass} mt-5`} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save check-in"}
              </button>
            </form>
          ) : null}

          {isActive && progress?.periodEnded ? (
            <section className="rounded-2xl border border-emerald-100 bg-[#ECFDF5] p-5">
              <p className="text-sm font-semibold text-slate-700">
                Your planned experiment period has ended. Complete it to see deterministic observations.
              </p>
              <button
                type="button"
                onClick={handleComplete}
                className={`${primaryButtonClass} mt-4`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Completing…" : "Complete experiment"}
              </button>
            </section>
          ) : null}

          {isActive && !progress?.periodEnded ? (
            <button
              type="button"
              onClick={handleComplete}
              className="text-sm font-semibold text-[#0F766E] underline"
              disabled={isSubmitting}
            >
              End experiment early and view observations
            </button>
          ) : null}

          {isCompleted && evaluation ? (
            <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-[#0F172A]">Experiment observations</h3>

              {evaluation.evaluationBlocked ? (
                <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-900">
                  {evaluation.blockReason}
                </div>
              ) : (
                <>
                  {evaluation.confidence ? (
                    <p className="mt-3 text-sm font-black uppercase tracking-wide text-[#0F766E]">
                      Confidence: {evaluation.confidence} (logging volume only, not clinical certainty)
                    </p>
                  ) : null}

                  <ul className="mt-4 space-y-2">
                    {evaluation.observations.map((line) => (
                      <li key={line} className="rounded-xl bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-slate-700">
                        {line}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-4 text-sm leading-6 text-slate-700">{evaluation.interpretation}</p>
                </>
              )}
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#ECFDF5] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black capitalize text-[#0F172A]">{value}</p>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={labelClass}>
      {label}: {value}/10
      <input
        className="mt-3 w-full accent-emerald-600"
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
