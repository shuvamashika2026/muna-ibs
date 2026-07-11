"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { PainChart } from "@/components/charts/PainChart";

type SymptomRow = {
  logged_at: string;
  severity: number | null;
  stress_level: number | null;
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30");
  const [summary, setSummary] = useState({
    averagePain: 0,
    highestPain: 0,
    averageBloating: 0,
    averageStress: 0,
    symptomLogs: 0,
  });
  const [painData, setPainData] = useState<{ date: string; pain: number }[]>([]);

  useEffect(() => {
    async function loadAnalytics() {
      if (!supabase) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - Number(period));

      const { data } = await supabase
        .from("symptoms")
        .select("logged_at, severity, stress_level")
        .eq("user_id", user.id)
        .gte("logged_at", fromDate.toISOString())
        .order("logged_at", { ascending: true });

      const rows = (data ?? []) as SymptomRow[];

      const painValues = rows.map((r) => Number(r.severity ?? 0));
      const bloatingValues = rows.map((r) => Number(r.severity ?? 0));
      const stressValues = rows.map((r) => Number(r.stress_level ?? 0));

      const average = (values: number[]) =>
        values.length
          ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
          : 0;

      setSummary({
        averagePain: average(painValues),
        highestPain: painValues.length ? Math.max(...painValues) : 0,
        averageBloating: average(bloatingValues),
        averageStress: average(stressValues),
        symptomLogs: rows.length,
      });

      setPainData(
        rows.map((row) => ({
          date: row.logged_at.slice(0, 10),
          pain: Number(row.severity ?? 0),
        }))
      );
    }

    loadAnalytics();
  }, [period]);

  const cards = [
    { label: "Average pain", value: `${summary.averagePain}/10`, hint: "Selected period" },
    { label: "Highest pain", value: `${summary.highestPain}/10`, hint: "Peak symptom level" },
    { label: "Average bloating", value: `${summary.averageBloating}/10`, hint: "Selected period" },
    { label: "Average stress", value: `${summary.averageStress}/10`, hint: "Selected period" },
    { label: "Symptom logs", value: summary.symptomLogs, hint: "Total entries found" },
  ];

  return (
    <AppShell title="Analytics" subtitle="Understand your IBS trends over time.">
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-emerald-950">Analytics period</h2>
        <p className="mt-2 text-slate-500">Select the period you want to analyse.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {["7", "30", "90", "365"].map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`rounded-xl px-5 py-3 font-semibold transition ${
                period === item
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {item === "365" ? "1 Year" : `${item} Days`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-emerald-950">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PainChart data={painData} />
      </div>

      <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-amber-950">AI Trend Analysis</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          MUNA will analyse your trends here once more symptom records are available.
        </p>
      </div>
    </AppShell>
  );
}
