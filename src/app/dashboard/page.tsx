"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { QuickActions } from "@/components/quick-actions";
import { supabase } from "@/lib/supabase";
import { Apple, Activity, HeartPulse, Droplets, Pill } from "lucide-react";

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
  .select("water_goal")
  .eq("id", user.id)
  .maybeSingle();

      setStats({
        mealsToday: mealsCount ?? 0,
        painLevel: latestSymptom?.pain_level?.toString() ?? "-",
        bloatingLevel: latestSymptom?.bloating_level?.toString() ?? "-",
        bristolType: latestBowel?.bristol_type?.toString() ?? "-",
        waterToday: waterTotal,
        waterGoal: 2500,
        sleepHours: latestSleep?.hours?.toString() ?? "-",
        medications: medicationCount ?? 0,
      });
    }

    loadDashboard();
  }, []);

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
      icon: Activity,
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
      subtitle="Your live IBS tracking snapshot in one place."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm"
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

      <div className="mt-6 rounded-lg border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-emerald-950">Today</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Link
            href="/add-meal"
            className="rounded-lg bg-emerald-600 px-5 py-4 text-center font-semibold text-white"
          >
            Add meal
          </Link>

          <Link
            href="/add-symptoms"
            className="rounded-lg bg-sky-600 px-5 py-4 text-center font-semibold text-white"
          >
            Add symptoms
          </Link>

          <Link
            href="/bowel-movement"
            className="rounded-lg bg-teal-700 px-5 py-4 text-center font-semibold text-white"
          >
            Log bowel movement
          </Link>

          <Link
            href="/water"
            className="rounded-lg bg-cyan-600 px-5 py-4 text-center font-semibold text-white"
          >
            Log water
          </Link>

          <Link
            href="/medication"
            className="rounded-lg bg-purple-600 px-5 py-4 text-center font-semibold text-white"
          >
            Add medication
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-emerald-950">Water today</h2>
        <p className="mt-2 text-3xl font-bold text-emerald-950">
          {stats.waterToday} / {stats.waterGoal} mL
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Total water logged today
        </p>
      </div>

      <div className="mt-6">
        <QuickActions />
      </div>
    </AppShell>
  );
}