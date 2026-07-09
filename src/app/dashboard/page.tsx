"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { QuickActions } from "@/components/quick-actions";
import { supabase } from "@/lib/supabase";
import {
  Apple,
  Activity,
  HeartPulse,
  Droplets,
  Pill,
  ShieldCheck,
  Moon,
  CalendarDays,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    mealsToday: 0,
    painLevel: "-",
    bloatingLevel: "-",
    bristolType: "-",
    waterToday: 0,
    waterGoal: 2500,
    sleepHours: "-",
    medications: 0,
    ibsScore: 100,
  });

  useEffect(() => {
    async function loadDashboard() {
      if (!supabase) return;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      const { count: mealsCount } = await supabase
        .from("meals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("meal_date", today);

      const { data: latestSymptom } = await supabase
        .from("symptoms")
        .select("pain_level, bloating_level")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: latestBowel } = await supabase
        .from("bowel_movements")
        .select("bristol_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: waterLogs } = await supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .eq("log_date", today);

      const waterTotal =
        waterLogs?.reduce(
          (sum, item) => sum + Number(item.amount_ml || 0),
          0
        ) ?? 0;

      const { data: latestSleep } = await supabase
        .from("sleep_logs")
        .select("hours, quality")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: medicationCount } = await supabase
        .from("medications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("active", true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("water_goal, sleep_goal")
        .eq("id", user.id)
        .maybeSingle();

      const pain = Number(latestSymptom?.pain_level ?? 0);
      const bloating = Number(latestSymptom?.bloating_level ?? 0);
      const bristol = Number(latestBowel?.bristol_type ?? 4);
      const sleep = Number(latestSleep?.hours ?? 8);
      const waterGoal = Number(profile?.water_goal ?? 2500);
      const sleepGoal = Number(profile?.sleep_goal ?? 7);

      let score = 100;
      score -= pain * 4;
      score -= bloating * 3;
      if (bristol !== 3 && bristol !== 4) score -= 10;
      if (waterTotal < waterGoal) score -= 5;
      if (sleep < sleepGoal) score -= 5;
      score = Math.max(0, Math.min(100, Math.round(score)));

      setStats({
        mealsToday: mealsCount ?? 0,
        painLevel: latestSymptom?.pain_level?.toString() ?? "-",
        bloatingLevel: latestSymptom?.bloating_level?.toString() ?? "-",
        bristolType: latestBowel?.bristol_type?.toString() ?? "-",
        waterToday: waterTotal,
        waterGoal,
        sleepHours: latestSleep?.hours?.toString() ?? "-",
        medications: medicationCount ?? 0,
        ibsScore: score,
      });
    }

    loadDashboard();
  }, []);

  const waterProgress = Math.min(
    100,
    Math.round((stats.waterToday / stats.waterGoal) * 100)
  );

  const scoreLabel =
    stats.ibsScore >= 80
      ? "Stable"
      : stats.ibsScore >= 60
      ? "Mild flare risk"
      : stats.ibsScore >= 40
      ? "Moderate symptoms"
      : "High flare risk";

  const cards = [
    {
      label: "Meals today",
      value: stats.mealsToday,
      hint: "Meals logged today",
      icon: Apple,
    },
    {
      label: "Pain level",
      value: stats.painLevel,
      hint: "Latest symptom entry",
      icon: HeartPulse,
    },
    {
      label: "Bloating",
      value: stats.bloatingLevel,
      hint: "Latest symptom entry",
      icon: Activity,
    },
    {
      label: "Bristol type",
      value: stats.bristolType,
      hint: "Latest bowel movement",
      icon: Droplets,
    },
    {
      label: "Sleep",
      value: stats.sleepHours,
      hint: "Latest sleep entry",
      icon: Moon,
    },
    {
      label: "Medications",
      value: stats.medications,
      hint: "Active medicines",
      icon: Pill,
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your personalised IBS health snapshot."
    >
      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">
              MUNA IBS Score
            </p>
            <h2 className="mt-2 text-5xl font-bold">{stats.ibsScore} / 100</h2>
            <p className="mt-3 text-lg font-medium text-emerald-50">
              {scoreLabel}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-emerald-50">
              Based on your latest pain, bloating, bowel movement, water, and sleep logs.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-5 text-center backdrop-blur">
            <ShieldCheck className="mx-auto h-12 w-12 text-white" />
            <p className="mt-3 text-sm font-semibold">Today’s status</p>
            <p className="mt-1 text-2xl font-bold">{scoreLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-emerald-950">Water progress</h2>
              <p className="mt-1 text-sm text-slate-500">
                {stats.waterToday} / {stats.waterGoal} mL
              </p>
            </div>
            <Droplets className="h-8 w-8 text-cyan-600" />
          </div>

          <div className="mt-5 h-4 overflow-hidden rounded-full bg-cyan-100">
            <div
              className="h-full rounded-full bg-cyan-600"
              style={{ width: `${waterProgress}%` }}
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-600">
            {waterProgress}% of your daily goal completed
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-emerald-950">Sleep</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest sleep entry
              </p>
            </div>
            <Moon className="h-8 w-8 text-indigo-600" />
          </div>

          <p className="mt-5 text-4xl font-bold text-emerald-950">
            {stats.sleepHours} hrs
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Sleep quality will be added to Dashboard 2.1.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
            >
              <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-950">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-slate-500">{card.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-emerald-950">Quick log</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Link href="/add-meal" className="rounded-xl bg-emerald-600 px-5 py-4 text-center font-semibold text-white">
            Add meal
          </Link>

          <Link href="/add-symptoms" className="rounded-xl bg-sky-600 px-5 py-4 text-center font-semibold text-white">
            Add symptoms
          </Link>

          <Link href="/bowel-movement" className="rounded-xl bg-teal-700 px-5 py-4 text-center font-semibold text-white">
            Log bowel
          </Link>

          <Link href="/water" className="rounded-xl bg-cyan-600 px-5 py-4 text-center font-semibold text-white">
            Log water
          </Link>

          <Link href="/medication" className="rounded-xl bg-purple-600 px-5 py-4 text-center font-semibold text-white">
            Medication
          </Link>

          <Link href="/history" className="rounded-xl bg-slate-700 px-5 py-4 text-center font-semibold text-white">
            History
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-1 h-6 w-6 text-amber-700" />
          <div>
            <h2 className="text-xl font-bold text-amber-950">Today’s insight</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Keep logging meals, symptoms, water, sleep, and bowel movements.
              MUNA will use this data to identify possible IBS patterns and triggers.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <QuickActions />
      </div>
    </AppShell>
  );
}