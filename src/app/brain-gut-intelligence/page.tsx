"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
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
import {
  Activity,
  Brain,
  Check,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type IntelligenceData = {
  meals: DbRow[];
  water: DbRow[];
  sleep: DbRow[];
  symptoms: DbRow[];
  stools: DbRow[];
  medications: DbRow[];
  accessNotes: string[];
  isLoading: boolean;
};

type TrendPoint = {
  date: string;
  pain: number | null;
  stress: number | null;
  sleep: number | null;
  water: number | null;
  bristol: number | null;
  meals: number;
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const exampleTrend = [
  { date: "Mon", pain: 4, stress: 6, sleep: 6.2, water: 1.4, bristol: 3, meals: 3 },
  { date: "Tue", pain: 3, stress: 5, sleep: 6.9, water: 1.6, bristol: 4, meals: 3 },
  { date: "Wed", pain: 2, stress: 4, sleep: 7.4, water: 2.1, bristol: 4, meals: 4 },
  { date: "Thu", pain: 2, stress: 3, sleep: 7.6, water: 2.2, bristol: 4, meals: 3 },
];

function getDate(row: DbRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value) return value.slice(0, 10);
  }

  return "";
}

function getText(row: DbRow, keys: string[]) {
  return keys
    .map((key) => row[key])
    .filter((value) => typeof value === "string" || typeof value === "number")
    .join(" ")
    .toLowerCase();
}

function getNumber(row: DbRow | undefined, keys: string[]) {
  if (!row) return null;

  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }

  return null;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function scoreFromAverages({
  pain,
  stress,
  sleep,
  water,
  bristol,
}: {
  pain: number | null;
  stress: number | null;
  sleep: number | null;
  water: number | null;
  bristol: number | null;
}) {
  if ([pain, stress, sleep, water, bristol].every((value) => value === null)) return null;

  let score = 100;
  score -= (pain ?? 3) * 4;
  score -= Math.max(0, (stress ?? 4) - 3) * 4;
  if ((sleep ?? 7.2) < 7) score -= 8;
  if ((water ?? 2) < 1.8) score -= 7;
  if (bristol !== null && ![3, 4, 5].includes(Math.round(bristol))) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

async function safeQuery(table: string, userId: string, limit = 90) {
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

export default function BrainGutIntelligencePage() {
  const [data, setData] = useState<IntelligenceData>({
    meals: [],
    water: [],
    sleep: [],
    symptoms: [],
    stools: [],
    medications: [],
    accessNotes: [],
    isLoading: true,
  });

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setData((current) => ({
          ...current,
          accessNotes: ["Supabase is not configured."],
          isLoading: false,
        }));
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const [meals, water, sleep, symptoms, stools, reminders] = await Promise.all([
        safeQuery("meals", user.id),
        safeQuery("water_logs", user.id),
        safeQuery("sleep_logs", user.id),
        safeQuery("symptoms", user.id),
        safeQuery("bowel_movements", user.id),
        safeQuery("medication_reminders", user.id),
      ]);

      setData({
        meals: meals.rows,
        water: water.rows,
        sleep: sleep.rows,
        symptoms: symptoms.rows,
        stools: stools.rows,
        medications: reminders.rows,
        accessNotes: [
          meals.error && `Meals: ${meals.error}`,
          water.error && `Water: ${water.error}`,
          sleep.error && `Sleep: ${sleep.error}`,
          symptoms.error && `Symptoms: ${symptoms.error}`,
          stools.error && `Stool: ${stools.error}`,
          reminders.error && `Medication reminders: ${reminders.error}`,
        ].filter((item): item is string => Boolean(item)),
        isLoading: false,
      });
    }

    loadData();
  }, []);

  const analytics = useMemo(() => buildAnalytics(data), [data]);

  return (
    <AppShell
      title="Brain-Gut Intelligence"
      subtitle="Personal pattern analysis from your MUNA logs."
    >
      <motion.div
        className="mx-auto max-w-7xl space-y-5 pb-10"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      >
        <HeroCard isLoading={data.isLoading} dataQuality={analytics.dataQuality} />

        {data.accessNotes.length ? (
          <NoticeCard
            title="Some data could not be loaded"
            body={data.accessNotes.join(" ")}
            tone="warning"
          />
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <TriggerRankingCard triggers={analytics.triggerRankings} hasEnoughData={analytics.hasEnoughTriggerData} />
          <PatternDetectionCard patterns={analytics.patterns} hasEnoughData={analytics.hasEnoughPatternData} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <MetricCard
            icon={TriangleAlert}
            label="Flare Prediction"
            value={analytics.flarePrediction.label}
            detail={`${analytics.flarePrediction.confidence}% confidence`}
            hasData={analytics.hasEnoughPredictionData}
            example="Example Insight: Low risk often appears when sleep is above 7 hours and stress is low."
          />
          <MetricCard
            icon={TrendingUp}
            label="Weekly Recovery Score"
            value={analytics.recoveryScore === null ? "Not enough data yet" : `${analytics.recoveryScore}/100`}
            detail="Based on pain, stress, sleep, water and stool stability"
            hasData={analytics.recoveryScore !== null}
            example="Example Insight: Recovery score improves as pain and stress trend down."
          />
          <MetricCard
            icon={Brain}
            label="Brain-Gut Balance"
            value={analytics.brainGutBalance === null ? "Not enough data yet" : `${analytics.brainGutBalance}%`}
            detail="Stress, sleep and symptom alignment"
            hasData={analytics.brainGutBalance !== null}
            example="Example Insight: calmer stress days can support gut stability."
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <WeeklySummaryCard summary={analytics.weeklySummary} hasEnoughData={analytics.hasEnoughSummaryData} />
          <RecoveryPlanCard items={analytics.recoveryPlan} hasEnoughData={analytics.hasEnoughSummaryData} />
        </section>

        <TrendCharts trends={analytics.trends} hasEnoughData={analytics.hasEnoughTrendData} />
      </motion.div>
    </AppShell>
  );
}

function buildAnalytics(data: IntelligenceData) {
  const trendMap = new Map<string, TrendPoint>();

  function ensure(date: string) {
    const label = date || "Unknown";
    const existing = trendMap.get(label);
    if (existing) return existing;

    const next: TrendPoint = {
      date: label,
      pain: null,
      stress: null,
      sleep: null,
      water: null,
      bristol: null,
      meals: 0,
    };
    trendMap.set(label, next);
    return next;
  }

  data.symptoms.forEach((row) => {
    const point = ensure(getDate(row, ["symptom_date", "logged_at", "created_at"]));
    point.pain = getNumber(row, ["pain_level", "severity", "pain"]);
    point.stress = getNumber(row, ["stress_level", "stress"]);
  });

  data.sleep.forEach((row) => {
    const point = ensure(getDate(row, ["sleep_date", "slept_on", "created_at"]));
    point.sleep = getNumber(row, ["hours", "sleep_hours"]);
  });

  data.water.forEach((row) => {
    const point = ensure(getDate(row, ["log_date", "logged_on", "created_at"]));
    const amountMl = getNumber(row, ["amount_ml"]);
    const cups = getNumber(row, ["cups"]);
    point.water = amountMl !== null ? amountMl / 1000 : cups !== null ? cups * 0.24 : null;
  });

  data.stools.forEach((row) => {
    const point = ensure(getDate(row, ["logged_at", "created_at"]));
    point.bristol = getNumber(row, ["bristol_type", "type"]);
  });

  data.meals.forEach((row) => {
    const point = ensure(getDate(row, ["meal_date", "eaten_at", "created_at"]));
    point.meals += 1;
  });

  const trends = Array.from(trendMap.values())
    .filter((point) => point.date !== "Unknown")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const painValues = trends.map((point) => point.pain).filter((value): value is number => value !== null);
  const stressValues = trends.map((point) => point.stress).filter((value): value is number => value !== null);
  const sleepValues = trends.map((point) => point.sleep).filter((value): value is number => value !== null);
  const waterValues = trends.map((point) => point.water).filter((value): value is number => value !== null);
  const bristolValues = trends.map((point) => point.bristol).filter((value): value is number => value !== null);
  const recoveryScore = scoreFromAverages({
    pain: average(painValues),
    stress: average(stressValues),
    sleep: average(sleepValues),
    water: average(waterValues),
    bristol: average(bristolValues),
  });
  const brainGutBalance =
    stressValues.length && sleepValues.length && painValues.length
      ? Math.round(((10 - (average(stressValues) ?? 5)) * 10 + (average(sleepValues) ?? 7) * 10 + (10 - (average(painValues) ?? 4)) * 10) / 3)
      : null;

  const triggerRankings = buildTriggerRankings(data.meals, data.symptoms);
  const patterns = buildPatterns(trends);
  const flareScore = recoveryScore === null ? null : 100 - recoveryScore;

  return {
    trends,
    triggerRankings,
    patterns,
    recoveryScore,
    brainGutBalance,
    dataQuality: `${data.meals.length + data.symptoms.length + data.sleep.length + data.water.length + data.stools.length} logs analysed`,
    hasEnoughTriggerData: data.meals.length >= 3 && data.symptoms.length >= 3 && triggerRankings.length > 0,
    hasEnoughPatternData: trends.length >= 4,
    hasEnoughPredictionData: recoveryScore !== null && trends.length >= 3,
    hasEnoughSummaryData: trends.length >= 3,
    hasEnoughTrendData: trends.length >= 2,
    flarePrediction: {
      label: flareScore === null ? "Not enough data yet" : flareScore > 55 ? "High" : flareScore > 30 ? "Medium" : "Low",
      confidence: flareScore === null ? 0 : Math.min(92, Math.max(55, Math.round(100 - Math.abs(50 - flareScore)))),
    },
    weeklySummary: buildSummary({ painValues, stressValues, sleepValues, waterValues, bristolValues, mealCount: data.meals.length }),
    recoveryPlan: buildRecoveryPlan({ stressValues, sleepValues, waterValues, bristolValues }),
  };
}

function buildTriggerRankings(meals: DbRow[], symptoms: DbRow[]) {
  const symptomDates = new Set(
    symptoms
      .filter((row) => (getNumber(row, ["pain_level", "severity"]) ?? 0) >= 4 || (getNumber(row, ["bloating_level"]) ?? 0) >= 4)
      .map((row) => getDate(row, ["symptom_date", "logged_at", "created_at"]))
      .filter(Boolean)
  );
  const triggerWords = ["coffee", "milk", "dairy", "onion", "garlic", "wheat", "fried", "spicy", "beans", "lentils"];
  const counts = new Map<string, number>();

  meals.forEach((row) => {
    const date = getDate(row, ["meal_date", "eaten_at", "created_at"]);
    if (!symptomDates.has(date)) return;

    const text = getText(row, ["meal_name", "foods", "ingredients", "drinks", "notes"]);
    triggerWords.forEach((word) => {
      if (text.includes(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
    });

    ["has_dairy", "has_onion", "has_garlic", "has_caffeine", "has_gluten"].forEach((key) => {
      if (row[key] === true) {
        const name = key.replace("has_", "");
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function buildPatterns(trends: TrendPoint[]) {
  if (trends.length < 4) return [];

  const patterns: string[] = [];
  const lowSleepPain = trends.filter((point) => (point.sleep ?? 8) < 7 && (point.pain ?? 0) >= 4).length;
  const highStressPain = trends.filter((point) => (point.stress ?? 0) >= 6 && (point.pain ?? 0) >= 4).length;
  const lowWaterStress = trends.filter((point) => (point.water ?? 3) < 1.8 && (point.stress ?? 0) >= 5).length;

  if (lowSleepPain >= 2) patterns.push("Pain appears higher on lower-sleep days.");
  if (highStressPain >= 2) patterns.push("Stress and pain rise together in your recent logs.");
  if (lowWaterStress >= 2) patterns.push("Low hydration overlaps with higher stress days.");

  return patterns;
}

function buildSummary({
  painValues,
  stressValues,
  sleepValues,
  waterValues,
  bristolValues,
  mealCount,
}: {
  painValues: number[];
  stressValues: number[];
  sleepValues: number[];
  waterValues: number[];
  bristolValues: number[];
  mealCount: number;
}) {
  return [
    `Average pain: ${average(painValues)?.toFixed(1) ?? "Not enough data yet"}`,
    `Average stress: ${average(stressValues)?.toFixed(1) ?? "Not enough data yet"}`,
    `Average sleep: ${average(sleepValues)?.toFixed(1) ?? "Not enough data yet"} hrs`,
    `Average water: ${average(waterValues)?.toFixed(1) ?? "Not enough data yet"} L`,
    `Typical Bristol type: ${average(bristolValues)?.toFixed(1) ?? "Not enough data yet"}`,
    `Meals logged: ${mealCount}`,
  ];
}

function buildRecoveryPlan({
  stressValues,
  sleepValues,
  waterValues,
  bristolValues,
}: {
  stressValues: number[];
  sleepValues: number[];
  waterValues: number[];
  bristolValues: number[];
}) {
  const items = [];

  if ((average(waterValues) ?? 0) < 1.8) items.push("Increase water gradually today.");
  if ((average(sleepValues) ?? 8) < 7) items.push("Protect sleep with an earlier wind-down.");
  if ((average(stressValues) ?? 0) >= 5) items.push("Use a 5-minute breathing break before dinner.");
  if (bristolValues.some((value) => ![3, 4, 5].includes(Math.round(value)))) items.push("Log stool type after your next bowel movement.");

  return items.length ? items : ["Maintain hydration, regular meals, and a calm evening routine."];
}

function HeroCard({ isLoading, dataQuality }: { isLoading: boolean; dataQuality: string }) {
  return (
    <motion.section variants={cardVariants} className="muna-dark-panel overflow-hidden rounded-[2.25rem] p-6 md:p-8">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-[#10B981]">Brain-Gut Intelligence</p>
      <h1 className="mt-3 text-4xl font-black tracking-normal text-white md:text-6xl">
        Personal IBS pattern detection
      </h1>
      <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-emerald-50">
        MUNA reviews your food, symptoms, sleep, stress, water, stool, and medication logs to find
        personal patterns. No diagnosis, no guesswork.
      </p>
      <p className="mt-6 w-fit rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white">
        {isLoading ? "Analysing logs..." : dataQuality}
      </p>
    </motion.section>
  );
}

function NoticeCard({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "warning" }) {
  return (
    <motion.section
      variants={cardVariants}
      className={`rounded-[1.5rem] p-5 ${
        tone === "warning" ? "border border-amber-200 bg-amber-50 text-amber-950" : "muna-card"
      }`}
    >
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{body}</p>
    </motion.section>
  );
}

function TriggerRankingCard({
  triggers,
  hasEnoughData,
}: {
  triggers: { name: string; count: number }[];
  hasEnoughData: boolean;
}) {
  return (
    <motion.section variants={cardVariants} className="muna-card rounded-[2rem] p-6">
      <SectionTitle icon={TriangleAlert} title="Personal Trigger Rankings" />
      {hasEnoughData ? (
        <div className="mt-6 space-y-4">
          {triggers.map((trigger) => (
            <div key={trigger.name}>
              <div className="mb-2 flex justify-between text-sm font-black">
                <span className="capitalize text-[#0F172A]">{trigger.name}</span>
                <span className="text-[#0F766E]">{trigger.count} overlaps</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#ECFDF5]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0F766E] to-[#10B981]"
                  style={{ width: `${Math.min(100, trigger.count * 24)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ExampleInsight>
          Not enough data yet. Example Insight: once you log several meals and symptom days, MUNA can
          rank foods that repeatedly appear before symptom increases.
        </ExampleInsight>
      )}
    </motion.section>
  );
}

function PatternDetectionCard({ patterns, hasEnoughData }: { patterns: string[]; hasEnoughData: boolean }) {
  return (
    <motion.section variants={cardVariants} className="muna-card rounded-[2rem] p-6">
      <SectionTitle icon={Brain} title="Brain-Gut Pattern Detection" />
      {hasEnoughData && patterns.length ? (
        <div className="mt-5 grid gap-3">
          {patterns.map((pattern) => (
            <p key={pattern} className="rounded-2xl bg-[#ECFDF5] p-4 font-bold text-[#0F172A]">
              <Sparkles className="mr-2 inline h-4 w-4 text-[#10B981]" aria-hidden="true" />
              {pattern}
            </p>
          ))}
        </div>
      ) : (
        <ExampleInsight>
          Not enough data yet. Example Insight: MUNA may detect that high stress plus short sleep
          is followed by higher bloating, once enough days are logged.
        </ExampleInsight>
      )}
    </motion.section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  hasData,
  example,
}: {
  icon: typeof Brain;
  label: string;
  value: string;
  detail: string;
  hasData: boolean;
  example: string;
}) {
  return (
    <motion.section variants={cardVariants} className="muna-card rounded-[2rem] p-5">
      <Icon className="h-6 w-6 text-[#10B981]" aria-hidden="true" />
      <p className="mt-4 text-sm font-black uppercase tracking-wide text-[#0F766E]">{label}</p>
      <p className="mt-2 text-3xl font-black text-[#0F172A]">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{hasData ? detail : example}</p>
    </motion.section>
  );
}

function WeeklySummaryCard({ summary, hasEnoughData }: { summary: string[]; hasEnoughData: boolean }) {
  return (
    <motion.section variants={cardVariants} className="muna-card rounded-[2rem] p-6">
      <SectionTitle icon={Activity} title="Weekly Health Summary" />
      {hasEnoughData ? (
        <div className="mt-5 grid gap-3">
          {summary.map((item) => (
            <p key={item} className="rounded-2xl bg-[#ECFDF5] p-4 font-bold text-slate-700">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <ExampleInsight>
          Not enough data yet. Example Insight: this will summarize weekly pain, stress, sleep,
          water, stool and meal logging once enough records exist.
        </ExampleInsight>
      )}
    </motion.section>
  );
}

function RecoveryPlanCard({ items, hasEnoughData }: { items: string[]; hasEnoughData: boolean }) {
  return (
    <motion.section variants={cardVariants} className="muna-soft-card rounded-[2rem] p-6">
      <SectionTitle icon={Check} title="Today's Recovery Plan" />
      {hasEnoughData ? (
        <div className="mt-5 grid gap-3">
          {items.map((item) => (
            <p key={item} className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 font-bold text-[#0F172A]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10B981] text-white">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
              {item}
            </p>
          ))}
        </div>
      ) : (
        <ExampleInsight>
          Not enough data yet. Example Insight: MUNA will build a recovery plan from your recent
          hydration, sleep, stool, symptoms and stress logs.
        </ExampleInsight>
      )}
    </motion.section>
  );
}

function TrendCharts({ trends, hasEnoughData }: { trends: TrendPoint[]; hasEnoughData: boolean }) {
  const chartData = hasEnoughData ? trends : exampleTrend;

  return (
    <motion.section variants={cardVariants} className="muna-card rounded-[2rem] p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle icon={TrendingUp} title="Trend Charts" />
        {!hasEnoughData ? (
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            Example Insight
          </span>
        ) : null}
      </div>
      {!hasEnoughData ? (
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Not enough data yet. The charts below are educational placeholders.
        </p>
      ) : null}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Pain, Sleep and Stress">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ECFDF5" vertical={false} />
            <XAxis dataKey="date" axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip />
            <Line type="monotone" dataKey="pain" stroke="#F43F5E" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="stress" stroke="#F59E0B" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="sleep" stroke="#8B5CF6" strokeWidth={3} dot={false} />
          </LineChart>
        </ChartPanel>
        <ChartPanel title="Water, Bowel Movements and Meals">
          <BarChart data={chartData}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip />
            <Bar dataKey="water" fill="#0EA5E9" radius={[10, 10, 0, 0]} />
            <Bar dataKey="bristol" fill="#10B981" radius={[10, 10, 0, 0]} />
            <Bar dataKey="meals" fill="#0F766E" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ChartPanel>
      </div>
    </motion.section>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-[1.5rem] bg-[#ECFDF5] p-4">
      <p className="mb-4 text-sm font-black text-[#065F46]">{title}</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Brain; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-black text-[#0F172A]">{title}</h2>
    </div>
  );
}

function ExampleInsight({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-[1.35rem] border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-amber-800">Example Insight</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-amber-950">{children}</p>
    </div>
  );
}
