"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DisclaimerNotice } from "@/components/disclaimer-notice";
import { supabase } from "@/lib/supabase";
import { RequireUserSession } from "@/lib/auth/require-user-session";
import { PrintButton } from "./print-button";

type WeeklySummary = {
  mealsLogged: number;
  averageSeverity: number | null;
  averageSleep: number | null;
};

function createEmptyWeeklySummary(): WeeklySummary {
  return {
    mealsLogged: 0,
    averageSeverity: null,
    averageSleep: null,
  };
}

export default function WeeklyReportPage() {
  return (
    <RequireUserSession
      loading={
        <AppShell title="Weekly report" subtitle="Export this summary as a PDF using your browser print dialog.">
          <p className="text-sm font-semibold text-slate-600">Loading your weekly summary…</p>
        </AppShell>
      }
    >
      {({ userId, generation }) => (
        <WeeklyReportPageLoaded key={generation} userId={userId} generation={generation} />
      )}
    </RequireUserSession>
  );
}

function WeeklyReportPageLoaded({
  userId,
  generation,
}: {
  userId: string;
  generation: number;
}) {
  const [summary, setSummary] = useState<WeeklySummary>(() => createEmptyWeeklySummary());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGeneration = generation;

    async function loadWeeklySummary() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || user.id !== userId || fetchGeneration !== generation) {
        return;
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const fromIso = weekStart.toISOString();

      const [mealsResult, symptomsResult, sleepResult] = await Promise.all([
        supabase
          .from("meals")
          .select("id")
          .eq("user_id", user.id)
          .gte("eaten_at", fromIso),
        supabase
          .from("symptoms")
          .select("severity")
          .eq("user_id", user.id)
          .gte("logged_at", fromIso),
        supabase
          .from("sleep_logs")
          .select("hours")
          .eq("user_id", user.id)
          .gte("created_at", fromIso),
      ]);

      if (fetchGeneration !== generation) {
        return;
      }

      const severities = (symptomsResult.data ?? [])
        .map((row) => Number(row.severity))
        .filter((value) => Number.isFinite(value));
      const sleepHours = (sleepResult.data ?? [])
        .map((row) => Number(row.hours))
        .filter((value) => Number.isFinite(value));

      setSummary({
        mealsLogged: mealsResult.data?.length ?? 0,
        averageSeverity: severities.length
          ? Number((severities.reduce((sum, value) => sum + value, 0) / severities.length).toFixed(1))
          : null,
        averageSleep: sleepHours.length
          ? Number((sleepHours.reduce((sum, value) => sum + value, 0) / sleepHours.length).toFixed(1))
          : null,
      });
      setIsLoading(false);
    }

    void loadWeeklySummary();
  }, [generation, userId]);

  return (
    <AppShell title="Weekly report" subtitle="Export this summary as a PDF using your browser print dialog.">
      <div className="grid gap-5">
        <DisclaimerNotice compact />
        <div className="no-print">
          <PrintButton />
        </div>
        <section className="print-card rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-emerald-950">MUNA IBS weekly summary</h2>
          {isLoading ? (
            <p className="mt-5 text-sm font-semibold text-slate-600">Loading your weekly summary…</p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Meals logged</p>
                <p className="mt-2 text-3xl font-bold text-emerald-950">{summary.mealsLogged}</p>
              </div>
              <div className="rounded-lg bg-sky-50 p-4">
                <p className="text-sm font-semibold text-sky-800">Avg symptom severity</p>
                <p className="mt-2 text-3xl font-bold text-sky-950">
                  {summary.averageSeverity != null ? `${summary.averageSeverity}/10` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-teal-50 p-4">
                <p className="text-sm font-semibold text-teal-800">Avg sleep</p>
                <p className="mt-2 text-3xl font-bold text-teal-950">
                  {summary.averageSleep != null ? `${summary.averageSleep} h` : "—"}
                </p>
              </div>
            </div>
          )}
          <div className="mt-5 rounded-lg border border-slate-100 p-4">
            <h3 className="font-bold text-emerald-950">Notes for clinician visit</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review repeated symptom timing, stress levels, sleep, and food logs with a qualified doctor or dietitian.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
