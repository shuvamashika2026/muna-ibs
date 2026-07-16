"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Award,
  Brain,
  CalendarDays,
  Check,
  Droplets,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Utensils,
  Waves,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { RequireUserSession } from "@/lib/auth/require-user-session";
import { hasEnoughScoreData } from "@/lib/dashboard/score-eligibility";

type DbRow = Record<string, unknown>;

type ReportData = {
  meals: DbRow[];
  symptoms: DbRow[];
  stools: DbRow[];
  water: DbRow[];
  sleep: DbRow[];
  medication: DbRow[];
  accessNotes: string[];
  isLoading: boolean;
};

type TrendPoint = {
  date: string;
  label: string;
  meals: number;
  pain: number | null;
  bloating: number | null;
  stress: number | null;
  sleep: number | null;
  water: number | null;
  bristol: number | null;
};

type TriggerScore = {
  name: string;
  count: number;
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

function getText(row: DbRow, keys: string[]) {
  return keys
    .map((key) => row[key])
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function getNumber(row: DbRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function getDate(row: DbRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value !== "string" || !value) continue;

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }

  return "";
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMetric(value: number | null, suffix = "", digits = 1) {
  if (value === null) return "Not enough data yet";
  return `${value.toFixed(digits)}${suffix}`;
}

async function safeQuery(table: string, userId: string, limit = 120) {
  if (!supabase) return { rows: [] as DbRow[], error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    rows: (data ?? []) as DbRow[],
    error: error?.message,
  };
}

export default function HealthReportPage() {
  return (
    <RequireUserSession
      loading={
        <AppShell title="AI Health Report" subtitle="A personal Brain-Gut Health Report generated from your MUNA logs.">
          <p className="text-sm font-semibold text-slate-600">Loading your health report…</p>
        </AppShell>
      }
    >
      {({ userId, generation }) => (
        <HealthReportPageLoaded key={generation} userId={userId} generation={generation} />
      )}
    </RequireUserSession>
  );
}

function HealthReportPageLoaded({
  userId,
  generation,
}: {
  userId: string;
  generation: number;
}) {
  const [reportData, setReportData] = useState<ReportData>({
    meals: [],
    symptoms: [],
    stools: [],
    water: [],
    sleep: [],
    medication: [],
    accessNotes: [],
    isLoading: true,
  });

  useEffect(() => {
    const fetchGeneration = generation;

    async function loadReportData() {
      if (!supabase) {
        setReportData((current) => ({
          ...current,
          accessNotes: ["Supabase is not configured."],
          isLoading: false,
        }));
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user || user.id !== userId || fetchGeneration !== generation) {
        return;
      }

      const [meals, symptoms, stools, water, sleep, reminders] = await Promise.all([
        safeQuery("meals", user.id),
        safeQuery("symptoms", user.id),
        safeQuery("bowel_movements", user.id),
        safeQuery("water_logs", user.id),
        safeQuery("sleep_logs", user.id),
        safeQuery("medication_reminders", user.id),
      ]);

      setReportData({
        meals: meals.rows,
        symptoms: symptoms.rows,
        stools: stools.rows,
        water: water.rows,
        sleep: sleep.rows,
        medication: reminders.rows,
        accessNotes: [
          meals.error && `Meals: ${meals.error}`,
          symptoms.error && `Symptoms: ${symptoms.error}`,
          stools.error && `Bowel movements: ${stools.error}`,
          water.error && `Water: ${water.error}`,
          sleep.error && `Sleep: ${sleep.error}`,
          reminders.error && `Medication reminders: ${reminders.error}`,
        ].filter((item): item is string => Boolean(item)),
        isLoading: false,
      });
    }

    void loadReportData();
  }, [generation, userId]);

  const analytics = useMemo(() => buildReportAnalytics(reportData), [reportData]);
  const generatedOn = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    []
  );

  return (
    <AppShell
      title="AI Health Report"
      subtitle="A personal Brain-Gut Health Report generated from your MUNA logs."
    >
      <motion.div
        className="mx-auto max-w-7xl space-y-5 pb-10"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      >
        <ReportHero generatedOn={generatedOn} isDemo={!analytics.hasEnoughCoreData} isLoading={reportData.isLoading} />

        {reportData.accessNotes.length ? (
          <NoticeCard title="Some report data could not be loaded" body={reportData.accessNotes.join(" ")} />
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <OverallHealthCard score={analytics.gutScore} isDemo={!analytics.hasEnoughCoreData} />
          <ForecastCard forecast={analytics.forecast} isDemo={!analytics.hasEnoughForecastData} />
        </section>

        <BrainGutAnalysisCard summary={analytics.brainGutSummary} hasEnoughData={analytics.hasEnoughCoreData} />

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <TopTriggersCard triggers={analytics.triggers} hasEnoughData={analytics.hasEnoughTriggerData} />
          <FoodsCard tolerated={analytics.toleratedFoods} monitor={analytics.foodsToMonitor} hasEnoughData={analytics.hasEnoughFoodData} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <RecoveryPlanCard items={analytics.recoveryPlan} hasEnoughData={analytics.hasEnoughCoreData} />
          <WeeklySummaryCard summary={analytics.weeklySummary} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <WhatMunaLearnedCard insight={analytics.learnedInsight} hasEnoughData={analytics.hasEnoughCoreData} />
          <AchievementsCard achievements={analytics.achievements} />
        </section>

        <TrendChartCard trends={analytics.trends} hasEnoughData={analytics.hasEnoughTrendData} />
        <NextGoalCard goal={analytics.nextGoal} />
        <ReportFooter />
      </motion.div>
    </AppShell>
  );
}

function buildReportAnalytics(data: ReportData) {
  const trends = buildTrends(data);
  const recentTrends = trends.slice(-7);
  const painValues = recentTrends.map((point) => point.pain).filter((value): value is number => value !== null);
  const bloatingValues = recentTrends.map((point) => point.bloating).filter((value): value is number => value !== null);
  const stressValues = recentTrends.map((point) => point.stress).filter((value): value is number => value !== null);
  const sleepValues = recentTrends.map((point) => point.sleep).filter((value): value is number => value !== null);
  const waterValues = recentTrends.map((point) => point.water).filter((value): value is number => value !== null);
  const bristolValues = recentTrends.map((point) => point.bristol).filter((value): value is number => value !== null);
  const totalLogs = data.meals.length + data.symptoms.length + data.stools.length + data.water.length + data.sleep.length;
  const hasEnoughCoreData = totalLogs >= 8 && recentTrends.length >= 3;
  const enoughScoreData = hasEnoughScoreData({
    meals: data.meals.length,
    symptoms: data.symptoms.length,
    bowelMovements: data.stools.length,
  });
  const gutScore = enoughScoreData
    ? calculateGutScore({
        pain: average(painValues),
        bloating: average(bloatingValues),
        stress: average(stressValues),
        sleep: average(sleepValues),
        water: average(waterValues),
        bristol: average(bristolValues),
      })
    : null;
  const triggers = buildTriggerScores(data.meals, data.symptoms);
  const foods = buildFoodSignals(data.meals, data.symptoms);
  const hasEnoughTriggerData = data.meals.length >= 4 && data.symptoms.length >= 4 && triggers.length > 0;
  const hasEnoughFoodData = data.meals.length >= 6 && data.symptoms.length >= 4;
  const hasEnoughForecastData = hasEnoughCoreData && painValues.length >= 2 && stressValues.length >= 2;
  const flareRiskScore = gutScore === null ? null : 100 - gutScore;
  const risk =
    flareRiskScore === null || !hasEnoughForecastData
      ? null
      : flareRiskScore > 55
        ? "High"
        : flareRiskScore > 32
          ? "Moderate"
          : "Low";
  const confidence =
    hasEnoughForecastData && flareRiskScore !== null ? Math.min(91, Math.max(62, Math.round(95 - Math.abs(45 - flareRiskScore)))) : null;

  return {
    trends,
    hasEnoughCoreData,
    hasEnoughTrendData: trends.length >= 2,
    hasEnoughTriggerData,
    hasEnoughFoodData,
    hasEnoughForecastData,
    gutScore: gutScore,
    forecast: {
      risk,
      confidence,
      reasons: buildForecastReasons({ sleepValues, stressValues, waterValues, bristolValues, painValues }),
    },
    triggers: hasEnoughTriggerData ? triggers : [],
    toleratedFoods: hasEnoughFoodData ? foods.tolerated : [],
    foodsToMonitor: hasEnoughFoodData ? foods.monitor : [],
    brainGutSummary: buildBrainGutSummary({ hasEnoughCoreData, stressValues, sleepValues, waterValues, painValues, data }),
    recoveryPlan: buildRecoveryPlan({ hasEnoughCoreData, stressValues, sleepValues, waterValues, bristolValues }),
    weeklySummary: [
      { label: "Meals Logged", value: String(data.meals.length), hasData: data.meals.length > 0 },
      { label: "Average Pain", value: formatMetric(average(painValues), "/10"), hasData: painValues.length > 0 },
      { label: "Average Sleep", value: formatMetric(average(sleepValues), " hrs"), hasData: sleepValues.length > 0 },
      { label: "Average Water", value: formatMetric(average(waterValues), " L"), hasData: waterValues.length > 0 },
      { label: "Average Stress", value: formatMetric(average(stressValues), "/10"), hasData: stressValues.length > 0 },
      { label: "Average Gut Score", value: gutScore === null ? "Not enough data yet" : `${gutScore}/100`, hasData: gutScore !== null },
    ],
    learnedInsight: hasEnoughCoreData
      ? buildLearnedInsight({ stressValues, sleepValues, waterValues, painValues })
      : "More logging is needed before MUNA can identify reliable personal patterns.",
    achievements: buildAchievements({ trends, waterValues, sleepValues }),
    nextGoal: buildNextGoal({ waterValues, sleepValues, stressValues, hasEnoughCoreData }),
  };
}

function buildTrends(data: ReportData) {
  const trendMap = new Map<string, TrendPoint>();

  function ensure(date: string) {
    const key = date || "Unknown";
    const existing = trendMap.get(key);
    if (existing) return existing;

    const parsed = new Date(`${key}T00:00:00`);
    const label = key === "Unknown" || Number.isNaN(parsed.getTime()) ? "Unknown" : parsed.toLocaleDateString("en", { weekday: "short" });
    const point: TrendPoint = { date: key, label, meals: 0, pain: null, bloating: null, stress: null, sleep: null, water: null, bristol: null };
    trendMap.set(key, point);
    return point;
  }

  data.symptoms.forEach((row) => {
    const point = ensure(getDate(row, ["symptom_date", "logged_at", "created_at"]));
    point.pain = getNumber(row, ["pain_level", "pain", "severity"]);
    point.bloating = getNumber(row, ["bloating_level", "bloating"]);
    point.stress = getNumber(row, ["stress_level", "stress"]);
  });

  data.sleep.forEach((row) => {
    const point = ensure(getDate(row, ["sleep_date", "slept_on", "created_at"]));
    point.sleep = getNumber(row, ["hours", "sleep_hours", "duration_hours"]);
  });

  data.water.forEach((row) => {
    const point = ensure(getDate(row, ["log_date", "logged_on", "created_at"]));
    const amountMl = getNumber(row, ["amount_ml", "ml"]);
    const liters = getNumber(row, ["liters", "litres"]);
    const cups = getNumber(row, ["cups"]);
    point.water = liters ?? (amountMl !== null ? amountMl / 1000 : cups !== null ? cups * 0.24 : null);
  });

  data.stools.forEach((row) => {
    const point = ensure(getDate(row, ["movement_date", "logged_at", "created_at"]));
    point.bristol = getNumber(row, ["bristol_type", "type", "stool_type"]);
  });

  data.meals.forEach((row) => {
    const point = ensure(getDate(row, ["meal_date", "eaten_at", "logged_at", "created_at"]));
    point.meals += 1;
  });

  return Array.from(trendMap.values())
    .filter((point) => point.date !== "Unknown")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

function calculateGutScore({
  pain,
  bloating,
  stress,
  sleep,
  water,
  bristol,
}: {
  pain: number | null;
  bloating: number | null;
  stress: number | null;
  sleep: number | null;
  water: number | null;
  bristol: number | null;
}) {
  if ([pain, bloating, stress, sleep, water, bristol].every((value) => value === null)) {
    return null;
  }

  let score = 100;
  if (pain !== null) score -= pain * 4;
  if (bloating !== null) score -= bloating * 3;
  if (stress !== null) score -= Math.max(0, stress - 3) * 4;
  if (sleep !== null && sleep < 7) score -= 8;
  if (water !== null && water < 1.8) score -= 7;
  if (bristol !== null && ![3, 4, 5].includes(Math.round(bristol))) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildForecastReasons({
  sleepValues,
  stressValues,
  waterValues,
  bristolValues,
  painValues,
}: {
  sleepValues: number[];
  stressValues: number[];
  waterValues: number[];
  bristolValues: number[];
  painValues: number[];
}) {
  const reasons = [
    average(sleepValues) === null ? "Sleep: not enough data yet" : `Sleep: ${average(sleepValues)?.toFixed(1)} hrs average`,
    average(stressValues) === null ? "Stress: not enough data yet" : `Stress: ${average(stressValues)?.toFixed(1)}/10 average`,
    average(waterValues) === null ? "Water: not enough data yet" : `Water: ${average(waterValues)?.toFixed(1)} L average`,
    average(bristolValues) === null ? "Bristol pattern: not enough data yet" : `Bristol pattern: type ${average(bristolValues)?.toFixed(1)}`,
    average(painValues) === null ? "Symptoms: not enough data yet" : `Symptoms: pain ${average(painValues)?.toFixed(1)}/10`,
  ];

  return reasons;
}

function buildTriggerScores(meals: DbRow[], symptoms: DbRow[]) {
  const highSymptomDates = new Set(
    symptoms
      .filter((row) => (getNumber(row, ["pain_level", "pain", "severity"]) ?? 0) >= 4 || (getNumber(row, ["bloating_level", "bloating"]) ?? 0) >= 4)
      .map((row) => getDate(row, ["symptom_date", "logged_at", "created_at"]))
      .filter(Boolean)
  );
  const triggerWords = ["stress", "garlic", "onion", "coffee", "dairy", "milk", "fried", "spicy", "wheat", "beans", "lentils"];
  const scores = new Map<string, number>();

  meals.forEach((row) => {
    const date = getDate(row, ["meal_date", "eaten_at", "logged_at", "created_at"]);
    if (!highSymptomDates.has(date)) return;

    const text = getText(row, ["meal_name", "foods", "ingredients", "drinks", "notes"]);
    triggerWords.forEach((word) => {
      if (text.includes(word)) scores.set(titleCase(word), (scores.get(titleCase(word)) ?? 0) + 1);
    });

    [
      ["has_dairy", "Dairy"],
      ["has_garlic", "Garlic"],
      ["has_onion", "Onion"],
      ["has_caffeine", "Coffee"],
      ["has_gluten", "Wheat"],
    ].forEach(([key, label]) => {
      if (row[key] === true) scores.set(label, (scores.get(label) ?? 0) + 1);
    });
  });

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function buildFoodSignals(meals: DbRow[], symptoms: DbRow[]) {
  const highSymptomDates = new Set(
    symptoms
      .filter((row) => (getNumber(row, ["pain_level", "pain", "severity"]) ?? 0) >= 4 || (getNumber(row, ["bloating_level", "bloating"]) ?? 0) >= 4)
      .map((row) => getDate(row, ["symptom_date", "logged_at", "created_at"]))
      .filter(Boolean)
  );
  const safeCounts = new Map<string, number>();
  const monitorCounts = new Map<string, number>();

  meals.forEach((row) => {
    const date = getDate(row, ["meal_date", "eaten_at", "logged_at", "created_at"]);
    const text = getText(row, ["meal_name", "foods", "ingredients", "drinks", "notes"]);
    const foods = extractFoodWords(text);
    const target = highSymptomDates.has(date) ? monitorCounts : safeCounts;
    foods.forEach((food) => target.set(food, (target.get(food) ?? 0) + 1));
  });

  return {
    tolerated: topWords(safeCounts),
    monitor: topWords(monitorCounts),
  };
}

function extractFoodWords(text: string) {
  const common = new Set(["and", "with", "for", "meal", "breakfast", "lunch", "dinner", "snack", "the", "rice"]);
  return Array.from(
    new Set(
      text
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !common.has(word))
        .map(titleCase)
    )
  ).slice(0, 6);
}

function topWords(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name]) => name);
}

function buildBrainGutSummary({
  hasEnoughCoreData,
  stressValues,
  sleepValues,
  waterValues,
  painValues,
}: {
  hasEnoughCoreData: boolean;
  stressValues: number[];
  sleepValues: number[];
  waterValues: number[];
  painValues: number[];
  data: ReportData;
}) {
  if (!hasEnoughCoreData) {
    return "Based on your available information, stress and hydration appear important to monitor. Continue logging meals and symptoms so MUNA can identify your unique patterns.";
  }

  const stress = average(stressValues);
  const sleep = average(sleepValues);
  const water = average(waterValues);
  const pain = average(painValues);
  const signals = [];

  if (stress !== null && stress >= 5) signals.push("stress is running higher than ideal");
  if (sleep !== null && sleep < 7) signals.push("sleep recovery may need support");
  if (water !== null && water < 1.8) signals.push("hydration is still below target");
  if (pain !== null && pain <= 3) signals.push("pain logs look relatively stable");

  return signals.length
    ? `Your recent MUNA logs suggest that ${signals.join(", ")}. Keep using the diary so MUNA can separate one-off days from reliable personal patterns.`
    : "Your recent MUNA logs look broadly stable. Hydration, regular sleep, and simple meals appear to be supporting a calmer brain-gut pattern.";
}

function buildRecoveryPlan({
  hasEnoughCoreData,
  stressValues,
  sleepValues,
  waterValues,
  bristolValues,
}: {
  hasEnoughCoreData: boolean;
  stressValues: number[];
  sleepValues: number[];
  waterValues: number[];
  bristolValues: number[];
}) {
  if (!hasEnoughCoreData) {
    return [
      "Example: Drink water steadily through the day.",
      "Example: Choose a simple low-FODMAP meal.",
      "Example: Take a gentle 10-minute walk after food.",
      "Example: Log symptoms before bedtime.",
    ];
  }

  const actions = [];
  if ((average(waterValues) ?? 2) < 1.8) actions.push("Drink more water gradually today.");
  if ((average(sleepValues) ?? 8) < 7) actions.push("Protect an earlier sleep wind-down tonight.");
  if ((average(stressValues) ?? 0) >= 5) actions.push("Try a 5-minute breathing exercise before dinner.");
  if (bristolValues.some((value) => ![3, 4, 5].includes(Math.round(value)))) actions.push("Log your next bowel movement and Bristol type.");

  return actions.length ? actions : ["Keep meals simple, hydrate well, and maintain your current routine."];
}

function buildLearnedInsight({
  stressValues,
  sleepValues,
  waterValues,
  painValues,
}: {
  stressValues: number[];
  sleepValues: number[];
  waterValues: number[];
  painValues: number[];
}) {
  const stress = average(stressValues);
  const sleep = average(sleepValues);
  const water = average(waterValues);
  const pain = average(painValues);

  if (stress !== null && stress >= 5) return "Your logs suggest stress may be an important signal to watch before symptom changes.";
  if (sleep !== null && sleep >= 7 && pain !== null && pain <= 3) return "Your health logs suggest regular sleep may support more stable symptoms.";
  if (water !== null && water < 1.8) return "Your health logs suggest hydration is a practical area to improve before MUNA makes stronger predictions.";
  return "Your health logs suggest that maintaining hydration and regular sleep may support more stable symptoms.";
}

function buildAchievements({ trends, waterValues, sleepValues }: { trends: TrendPoint[]; waterValues: number[]; sleepValues: number[] }) {
  const achievements = [];
  if (hasSevenDayLoggingStreak(trends)) achievements.push("7-Day Logging Streak");
  if (waterValues.length >= 3 && (average(waterValues) ?? 0) >= 2) achievements.push("Hydration Goal");
  if (sleepValues.length >= 3 && (average(sleepValues) ?? 0) >= 7) achievements.push("Sleep Goal");
  return achievements;
}

function hasSevenDayLoggingStreak(trends: TrendPoint[]) {
  if (trends.length < 7) return false;
  const dates = new Set(trends.map((point) => point.date));
  const today = new Date();

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    if (!dates.has(date.toISOString().slice(0, 10))) return false;
  }

  return true;
}

function buildNextGoal({
  waterValues,
  sleepValues,
  stressValues,
  hasEnoughCoreData,
}: {
  waterValues: number[];
  sleepValues: number[];
  stressValues: number[];
  hasEnoughCoreData: boolean;
}) {
  if (!hasEnoughCoreData) return "Log one meal and one symptom entry today so MUNA can personalise your next report.";
  if ((average(waterValues) ?? 2) < 1.8) return "Try reaching your water goal tomorrow.";
  if ((average(sleepValues) ?? 8) < 7) return "Aim for a 30-minute earlier bedtime tonight.";
  if ((average(stressValues) ?? 0) >= 5) return "Complete one calm breathing session before your largest meal.";
  return "Maintain your current routine and keep logging for a stronger prediction.";
}

function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase();
}

function ReportHero({ generatedOn, isDemo, isLoading }: { generatedOn: string; isDemo: boolean; isLoading: boolean }) {
  return (
    <motion.section variants={cardVariants} className="overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,118,110,0.12)] ring-1 ring-emerald-100 md:p-8">
      <div className="relative">
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#D1FAE5] blur-3xl" />
        <div className="relative">
          <span className="grid h-16 w-16 place-items-center rounded-[1.5rem] bg-gradient-to-br from-[#0F766E] to-[#10B981] text-3xl shadow-[0_20px_50px_rgba(15,118,110,0.25)]">
            <Brain className="h-8 w-8 text-white" aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-[#0F766E]">Generated by MUNA AI</p>
          <h1 className="mt-3 text-4xl font-black tracking-normal text-[#0F172A] md:text-6xl">Brain-Gut Health Report</h1>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600 md:text-lg">
            Personalised health intelligence generated by MUNA AI.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge icon={CalendarDays} label={`Generated on ${generatedOn}`} />
            <Badge icon={ShieldCheck} label={isLoading ? "Analysing logs..." : isDemo ? "Example Demo Report" : "Personal report from your logs"} />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function NoticeCard({ title, body }: { title: string; body: string }) {
  return (
    <motion.section variants={cardVariants} className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{body}</p>
    </motion.section>
  );
}

function OverallHealthCard({ score, isDemo }: { score: number | null; isDemo: boolean }) {
  return (
    <ReportCard>
      <SectionHeader icon={HeartPulse} eyebrow="Section 1" title="Overall Health" />
      {isDemo ? <DemoPill label="Example Demo Report" /> : null}
      <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row">
        {score === null ? (
          <div className="flex-1 rounded-[1.5rem] bg-[#ECFDF5] p-5 text-sm font-semibold leading-6 text-slate-600">
            Log meals, symptoms, sleep, and water to generate your personal gut health score.
          </div>
        ) : (
          <>
            <CircularScore score={score} />
            <div className="flex-1">
              <p className="text-sm font-black uppercase tracking-wide text-slate-500">Gut Health Score</p>
              <p className="mt-2 text-4xl font-black text-[#0F172A]">{score} /100</p>
              <p className="mt-3 w-fit rounded-full bg-[#D1FAE5] px-4 py-2 text-sm font-black text-[#0F766E]">
                Status: {score >= 75 ? "Improving" : score >= 55 ? "Stable" : "Needs attention"}
              </p>
            </div>
          </>
        )}
      </div>
    </ReportCard>
  );
}

function ForecastCard({
  forecast,
  isDemo,
}: {
  forecast: { risk: string | null; confidence: number | null; reasons: string[] };
  isDemo: boolean;
}) {
  return (
    <ReportCard>
      <SectionHeader icon={TriangleAlert} eyebrow="Section 2" title="Today's Gut Forecast" />
      {isDemo ? <DemoPill label="Illustrative forecast" /> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[1.5rem] bg-gradient-to-br from-[#ECFDF5] to-white p-5">
          <p className="text-sm font-black text-slate-500">Risk</p>
          <p className="mt-2 text-4xl font-black text-[#0F766E]">
            {forecast.risk ?? "Not enough data"}
          </p>
          <p className="mt-3 text-sm font-bold text-slate-500">
            Confidence: {forecast.confidence === null ? "Not enough data" : `${forecast.confidence}%`}
          </p>
        </div>
        <div className="grid gap-2">
          {forecast.reasons.map((reason) => (
            <div key={reason} className="rounded-2xl bg-white/80 p-3 text-sm font-bold text-slate-600 ring-1 ring-emerald-100">
              {reason}
            </div>
          ))}
        </div>
      </div>
    </ReportCard>
  );
}

function BrainGutAnalysisCard({ summary, hasEnoughData }: { summary: string; hasEnoughData: boolean }) {
  return (
    <ReportCard>
      <SectionHeader icon={Brain} eyebrow="Section 3" title="Brain-Gut Analysis" />
      {!hasEnoughData ? <DemoPill label="More logs will improve personalisation" /> : null}
      <p className="mt-5 text-base font-semibold leading-8 text-slate-600">{summary}</p>
    </ReportCard>
  );
}

function TopTriggersCard({ triggers, hasEnoughData }: { triggers: TriggerScore[]; hasEnoughData: boolean }) {
  const display = hasEnoughData ? triggers : [];
  const max = Math.max(...display.map((trigger) => trigger.count), 1);

  return (
    <ReportCard>
      <SectionHeader icon={Waves} eyebrow="Section 4" title="Top Personal Triggers" />
      {!hasEnoughData ? (
        <p className="mt-4 rounded-[1.25rem] bg-[#ECFDF5] p-4 text-sm font-bold leading-6 text-[#0F766E]">
          Personal trigger analysis will appear after additional logs are collected.
        </p>
      ) : null}
      <div className="mt-5 grid gap-3">
        {display.length === 0 ? (
          <p className="text-sm font-semibold text-slate-600">No personal trigger patterns yet.</p>
        ) : (
          display.map((trigger) => (
          <div key={trigger.name}>
            <div className="mb-2 flex items-center justify-between text-sm font-black text-[#0F172A]">
              <span>{trigger.name}</span>
              <span>{hasEnoughData ? `${trigger.count} linked days` : "—"}</span>
            </div>
            <div className="h-3 rounded-full bg-emerald-50">
              <div className="h-3 rounded-full bg-gradient-to-r from-[#0F766E] to-[#10B981]" style={{ width: `${(trigger.count / max) * 100}%` }} />
            </div>
          </div>
          ))
        )}
      </div>
    </ReportCard>
  );
}

function FoodsCard({ tolerated, monitor, hasEnoughData }: { tolerated: string[]; monitor: string[]; hasEnoughData: boolean }) {
  return (
    <ReportCard>
      <SectionHeader icon={Utensils} eyebrow="Section 5" title="Foods" />
      {!hasEnoughData ? <DemoPill label="Example food cards" /> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FoodList title="Foods Well Tolerated" items={tolerated.length ? tolerated : ["Not enough data yet"]} tone="good" />
        <FoodList title="Foods To Monitor" items={monitor.length ? monitor : ["Not enough data yet"]} tone="watch" />
      </div>
    </ReportCard>
  );
}

function RecoveryPlanCard({ items, hasEnoughData }: { items: string[]; hasEnoughData: boolean }) {
  return (
    <ReportCard>
      <SectionHeader icon={Check} eyebrow="Section 6" title="Recovery Plan" />
      {!hasEnoughData ? <DemoPill label="Example actions until more logs exist" /> : null}
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <motion.div key={item} whileHover={{ x: 4 }} className="flex items-center gap-3 rounded-2xl bg-[#ECFDF5] p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10B981] text-white">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="font-bold text-[#0F172A]">{item}</p>
          </motion.div>
        ))}
      </div>
    </ReportCard>
  );
}

function WeeklySummaryCard({ summary }: { summary: { label: string; value: string; hasData: boolean }[] }) {
  return (
    <ReportCard>
      <SectionHeader icon={CalendarDays} eyebrow="Section 7" title="Weekly Summary" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {summary.map((item) => (
          <div key={item.label} className="rounded-[1.25rem] bg-white/80 p-4 ring-1 ring-emerald-100">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className={`mt-2 text-2xl font-black ${item.hasData ? "text-[#0F172A]" : "text-slate-400"}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </ReportCard>
  );
}

function WhatMunaLearnedCard({ insight, hasEnoughData }: { insight: string; hasEnoughData: boolean }) {
  return (
    <ReportCard>
      <SectionHeader icon={Sparkles} eyebrow="Section 8" title="What MUNA Learned" />
      {!hasEnoughData ? <DemoPill label="Reliable patterns not available yet" /> : null}
      <p className="mt-5 text-base font-semibold leading-8 text-slate-600">{insight}</p>
    </ReportCard>
  );
}

function AchievementsCard({ achievements }: { achievements: string[] }) {
  return (
    <ReportCard>
      <SectionHeader icon={Award} eyebrow="Section 9" title="Achievements" />
      <div className="mt-5 grid gap-3">
        {achievements.length ? (
          achievements.map((achievement) => (
            <div key={achievement} className="flex items-center gap-3 rounded-2xl bg-[#ECFDF5] p-4 font-black text-[#0F766E]">
              <Award className="h-5 w-5" aria-hidden="true" />
              {achievement}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
            No achievements unlocked yet. Keep logging consistently to earn streak, hydration, and sleep badges.
          </p>
        )}
      </div>
    </ReportCard>
  );
}

function TrendChartCard({ trends, hasEnoughData }: { trends: TrendPoint[]; hasEnoughData: boolean }) {
  const data = hasEnoughData
    ? trends.map((point) => ({
        label: point.label,
        gut: calculateGutScore({
          pain: point.pain,
          bloating: point.bloating,
          stress: point.stress,
          sleep: point.sleep,
          water: point.water,
          bristol: point.bristol,
        }),
        stress: point.stress,
        sleep: point.sleep,
        water: point.water,
      }))
    : [];

  return (
    <ReportCard>
      <SectionHeader icon={Droplets} eyebrow="Beautiful charts" title="Weekly Health Trends" />
      {!hasEnoughData ? <DemoPill label="Charts appear after more logs are collected" /> : null}
      {data.length === 0 ? (
        <p className="mt-5 text-sm font-semibold text-slate-600">No trend data yet for this account.</p>
      ) : (
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-72 rounded-[1.5rem] bg-[#ECFDF5] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#D1FAE5" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="gut" stroke="#0F766E" strokeWidth={4} dot={false} connectNulls />
              <Line type="monotone" dataKey="sleep" stroke="#8B5CF6" strokeWidth={3} dot={false} connectNulls />
              <Line type="monotone" dataKey="water" stroke="#0EA5E9" strokeWidth={3} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72 rounded-[1.5rem] bg-white p-4 ring-1 ring-emerald-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="stress" fill="#F59E0B" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}
    </ReportCard>
  );
}

function NextGoalCard({ goal }: { goal: string }) {
  return (
    <ReportCard>
      <SectionHeader icon={Target} eyebrow="Section 10" title="Next Goal" />
      <p className="mt-5 rounded-[1.5rem] bg-gradient-to-r from-[#0F766E] to-[#10B981] p-5 text-lg font-black text-white shadow-[0_18px_44px_rgba(15,118,110,0.22)]">
        {goal}
      </p>
    </ReportCard>
  );
}

function ReportFooter() {
  return (
    <motion.footer variants={cardVariants} className="rounded-[2rem] bg-[#0F172A] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.20)]">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-[#10B981]">Generated by MUNA AI</p>
      <p className="mt-3 text-2xl font-black">Powered by OpenAI</p>
      <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
        Medical education only. Not a diagnosis. MUNA does not prescribe treatment or replace a qualified doctor or dietitian.
        Always consult a qualified healthcare professional for medical concerns.
      </p>
    </motion.footer>
  );
}

function ReportCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.section variants={cardVariants} className="rounded-[2rem] border border-emerald-100/80 bg-white/82 p-5 shadow-[0_20px_70px_rgba(15,118,110,0.10)] backdrop-blur-xl md:p-6">
      {children}
    </motion.section>
  );
}

function SectionHeader({ icon: Icon, eyebrow, title }: { icon: React.ElementType; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F766E]">{eyebrow}</p>
        <h2 className="text-2xl font-black tracking-normal text-[#0F172A]">{title}</h2>
      </div>
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#0F766E] ring-1 ring-emerald-100">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </span>
  );
}

function DemoPill({ label }: { label: string }) {
  return <p className="mt-4 w-fit rounded-full bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-amber-700">{label}</p>;
}

function CircularScore({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#D1FAE5" strokeWidth="14" />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#0F766E"
          strokeLinecap="round"
          strokeWidth="14"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-black text-[#0F766E]">{score}</p>
          <p className="text-sm font-black text-slate-500">/100</p>
        </div>
      </div>
    </div>
  );
}

function FoodList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "watch" }) {
  return (
    <div className={`rounded-[1.5rem] p-5 ${tone === "good" ? "bg-[#ECFDF5]" : "bg-amber-50"}`}>
      <p className={`font-black ${tone === "good" ? "text-[#0F766E]" : "text-amber-700"}`}>{title}</p>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <p key={item} className="rounded-xl bg-white/75 px-3 py-2 text-sm font-bold text-[#0F172A]">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
