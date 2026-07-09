"use client";

import { useEffect, useState } from "react";
import { calculateRisk } from "@/lib/risk";
import { generateTodayPlan } from "@/lib/plan";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";
import { QuickActions } from "@/components/quick-actions";

import {
  Apple,
  Activity,
  HeartPulse,
  Droplets,
  Pill,
  Moon,
} from "lucide-react";

import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { WaterProgress } from "@/components/dashboard/WaterProgress";
import { SleepSummaryCard } from "@/components/dashboard/SleepSummaryCard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { QuickLog } from "@/components/dashboard/QuickLog";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    mealsToday: 0,
    painLevel: "-",
    bloatingLevel: "-",
    bristolType: "-",
    waterToday: 0,
    waterGoal: 2500,
    sleepHours: "-",
    sleepGoal: 7,
    medications: 0,
    ibsScore: 100,
    insight:
      "Keep logging your meals, symptoms, water, sleep, and bowel movements to unlock personalised IBS insights.",
    riskScore: 0,
    riskLevel: "Low",
    riskReasons: [] as string[],
    riskRecommendations: [] as string[],
    todayPlan: [] as string[],
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
        .select("pain_level, bloating_level, gas_level, stress_level")
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

      const { data: highFodmapMeals } = await supabase
        .from("meals")
        .select("id")
        .eq("user_id", user.id)
        .eq("meal_date", today)
        .eq("fodmap_level", "High");

      const pain = Number(latestSymptom?.pain_level ?? 0);
      const bloating = Number(latestSymptom?.bloating_level ?? 0);
      const stress = Number(latestSymptom?.stress_level ?? 0);
      const bristol = Number(latestBowel?.bristol_type ?? 4);
      const sleep = Number(latestSleep?.hours ?? 8);
      const waterGoal = Number(profile?.water_goal ?? 2500);
      const sleepGoal = Number(profile?.sleep_goal ?? 7);
      const hasHighFodmapMeal = (highFodmapMeals?.length ?? 0) > 0;

      const risk = calculateRisk({
        painLevel: pain,
        stressLevel: stress,
        waterToday: waterTotal,
        waterGoal,
        sleepHours: sleep,
        hasHighFodmapMeal,
        bristolType: bristol,
      });

      const todayPlan = generateTodayPlan({
        waterToday: waterTotal,
        waterGoal,
        sleepHours: sleep,
        sleepGoal,
        riskLevel: risk.level,
        hasHighFodmapMeal,
        painLevel: pain,
        stressLevel: stress,
      });

      let score = 100;
      score -= pain * 4;
      score -= bloating * 3;

      if (bristol !== 3 && bristol !== 4) score -= 10;
      if (waterTotal < waterGoal) score -= 5;
      if (sleep < sleepGoal) score -= 5;

      score = Math.max(0, Math.min(100, Math.round(score)));

      let insight =
        "Keep logging your meals, symptoms, water, sleep, and bowel movements to unlock personalised IBS insights.";

      if (pain >= 7 || bloating >= 7) {
        insight =
          "High symptom intensity detected. Review meals logged before this symptom and monitor whether the same food appears repeatedly.";
      } else if (stress >= 7) {
        insight =
          "High stress level detected. Stress can increase gut sensitivity, so relaxation, breathing, or light walking may help today.";
      } else if (waterTotal < waterGoal) {
        insight =
          "Water intake is below your profile goal today. Try to drink more gradually rather than drinking a large amount at once.";
      } else if (sleep < sleepGoal) {
        insight =
          "Sleep is below your profile goal. Poor sleep may increase IBS sensitivity for some people.";
      } else if (bristol === 1 || bristol === 2) {
        insight =
          "Your latest stool type suggests constipation tendency. Track fibre, water, movement, and symptoms together.";
      } else if (bristol === 6 || bristol === 7) {
        insight =
          "Your latest stool type suggests diarrhoea tendency. Review recent meals, stress, and hydration.";
      } else if ((mealsCount ?? 0) === 0) {
        insight =
          "No meals logged today yet. Add meals to help MUNA identify possible food-related patterns over time.";
      } else {
        insight =
          "Your latest logs look relatively stable. Continue logging consistently so MUNA can detect patterns over time.";
      }

      setStats({
        mealsToday: mealsCount ?? 0,
        painLevel: latestSymptom?.pain_level?.toString() ?? "-",
        bloatingLevel: latestSymptom?.bloating_level?.toString() ?? "-",
        bristolType: latestBowel?.bristol_type?.toString() ?? "-",
        waterToday: waterTotal,
        waterGoal,
        sleepHours: latestSleep?.hours?.toString() ?? "-",
        sleepGoal,
        medications: medicationCount ?? 0,
        ibsScore: score,
        insight,
        riskScore: risk.score,
        riskLevel: risk.level,
        riskReasons: risk.reasons,
        riskRecommendations: risk.recommendations,
        todayPlan,
      });
    }

    loadDashboard();
  }, []);

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
      hint: `Goal: ${stats.sleepGoal} hrs`,
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
      <DashboardHero ibsScore={stats.ibsScore} scoreLabel={scoreLabel} />

      <div className="mt-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Tomorrow&apos;s IBS Risk
            </p>

            <h2 className="mt-3 text-5xl font-bold text-emerald-950">
              {stats.riskScore}%
            </h2>

            <p className="mt-2 text-xl font-bold text-amber-800">
              {stats.riskLevel} Risk
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Based on your recent symptoms, hydration, sleep, bowel movement,
              and meal logs.
            </p>
          </div>

          <div className="grid h-36 w-36 place-items-center rounded-full border-8 border-amber-300 bg-white shadow-sm">
            <div className="text-center">
              <p className="text-4xl font-bold text-amber-700">
                {stats.riskScore}%
              </p>
              <p className="text-xs font-bold uppercase text-slate-500">
                {stats.riskLevel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-bold text-slate-800">Why?</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
              {stats.riskReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-4 shadow-sm">
            <p className="font-bold text-emerald-950">Today&apos;s Plan</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-emerald-800">
              {stats.todayPlan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <AIInsightCard insight={stats.insight} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <WaterProgress
          waterToday={stats.waterToday}
          waterGoal={stats.waterGoal}
        />

        <SleepSummaryCard
          sleepHours={stats.sleepHours}
          sleepGoal={stats.sleepGoal}
        />
      </div>

      <StatsCards cards={cards} />

      <QuickLog />

      <div className="mt-6">
        <QuickActions />
      </div>
    </AppShell>
  );
}