"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Area,
  AreaChart,
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
  Bell,
  Bot,
  Brain,
  Check,
  CirclePlus,
  Droplets,
  Flame,
  Home,
  Leaf,
  Moon,
  NotebookPen,
  Sparkles,
  UserRound,
  Waves,
} from "lucide-react";
import { calculateRisk } from "@/lib/risk";
import { generateTodayPlan } from "@/lib/plan";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";

type DashboardStats = {
  mealsToday: number;
  painLevel: string;
  bloatingLevel: string;
  bristolType: string;
  waterToday: number;
  waterGoal: number;
  sleepHours: string;
  sleepGoal: number;
  medications: number;
  ibsScore: number;
  insight: string;
  riskScore: number;
  riskLevel: string;
  riskReasons: string[];
  riskRecommendations: string[];
  todayPlan: string[];
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const trendData = [
  { day: "Mon", score: 61 },
  { day: "Tue", score: 66 },
  { day: "Wed", score: 69 },
  { day: "Thu", score: 72 },
  { day: "Fri", score: 76 },
  { day: "Sat", score: 80 },
  { day: "Sun", score: 82 },
];

const forecastData = [
  { day: "1", risk: 42 },
  { day: "2", risk: 52 },
  { day: "3", risk: 47 },
  { day: "4", risk: 64 },
  { day: "5", risk: 58 },
  { day: "6", risk: 72 },
];

const triggers = [
  { label: "Stress", value: 86 },
  { label: "Garlic", value: 72 },
  { label: "Poor Sleep", value: 58 },
  { label: "Dairy", value: 44 },
];

const fallbackPlan = [
  "Drink 1.4L more water",
  "10 minutes breathing",
  "Low FODMAP dinner",
  "Sleep before 11 PM",
];

export default function DashboardPage() {
  const [userName, setUserName] = useState("Shuvam");
  const [stats, setStats] = useState<DashboardStats>({
    mealsToday: 0,
    painLevel: "2",
    bloatingLevel: "3",
    bristolType: "4",
    waterToday: 2100,
    waterGoal: 2500,
    sleepHours: "7.8",
    sleepGoal: 7,
    medications: 0,
    ibsScore: 82,
    insight:
      "Your symptoms have improved over the last three days. Stress appears to be your strongest trigger. Continue hydration and avoid garlic today.",
    riskScore: 72,
    riskLevel: "Moderate",
    riskReasons: [],
    riskRecommendations: [],
    todayPlan: fallbackPlan,
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

      setUserName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Shuvam"
      );

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
        waterLogs?.reduce((sum, item) => sum + Number(item.amount_ml || 0), 0) ?? 0;

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

      const pain = Number(latestSymptom?.pain_level ?? 2);
      const bloating = Number(latestSymptom?.bloating_level ?? 3);
      const stress = Number(latestSymptom?.stress_level ?? 6);
      const bristol = Number(latestBowel?.bristol_type ?? 4);
      const sleep = Number(latestSleep?.hours ?? 7.8);
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

      setStats({
        mealsToday: mealsCount ?? 0,
        painLevel: latestSymptom?.pain_level?.toString() ?? "2",
        bloatingLevel: latestSymptom?.bloating_level?.toString() ?? "3",
        bristolType: latestBowel?.bristol_type?.toString() ?? "4",
        waterToday: waterTotal || 2100,
        waterGoal,
        sleepHours: latestSleep?.hours?.toString() ?? "7.8",
        sleepGoal,
        medications: medicationCount ?? 0,
        ibsScore: score,
        insight:
          "Your symptoms have improved over the last three days. Stress appears to be your strongest trigger. Continue hydration and avoid garlic today.",
        riskScore: risk.score || 72,
        riskLevel: risk.level === "Low" ? "Moderate" : risk.level,
        riskReasons: risk.reasons,
        riskRecommendations: risk.recommendations,
        todayPlan: todayPlan.length ? todayPlan : fallbackPlan,
      });
    }

    loadDashboard();
  }, []);

  const recoveryPlan = useMemo(() => {
    const plan = stats.todayPlan.length ? stats.todayPlan : fallbackPlan;
    return fallbackPlan.map((fallback, index) => plan[index] || fallback);
  }, [stats.todayPlan]);

  const waterLiters = Math.max(0, stats.waterToday / 1000).toFixed(1);

  const snapshotItems = [
    { label: "Pain", value: `${stats.painLevel}/10`, status: "Mild", icon: Activity, tint: "text-red-500" },
    { label: "Bloating", value: `${stats.bloatingLevel}/10`, status: "Mild", icon: Waves, tint: "text-[#0F766E]" },
    { label: "Stool", value: `Type ${stats.bristolType}`, status: "Ideal", icon: Sparkles, tint: "text-[#0F766E]" },
    { label: "Sleep", value: `${stats.sleepHours} hrs`, status: "Good", icon: Moon, tint: "text-violet-500" },
    { label: "Water", value: `${waterLiters}L`, status: "82% Goal", icon: Droplets, tint: "text-sky-500" },
    { label: "Stress", value: "3/10", status: "Low", icon: Brain, tint: "text-violet-600" },
  ];

  return (
    <AppShell title="Dashboard" hidePageHeader showDefaultBottomNav={false}>
      <motion.div
        className="mx-auto max-w-5xl space-y-5 pb-28"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section variants={cardVariants} className="flex items-start justify-between gap-4 pt-1">
          <div>
            <p className="text-3xl font-black tracking-normal text-[#0F172A] md:text-5xl">
              Good Evening, <span className="text-[#10B981]">{userName}</span>{" "}
              <span aria-hidden="true">{"\u{1F44B}"}</span>
            </p>
            <p className="mt-2 text-base font-bold text-slate-600 md:text-lg">
              Your AI Brain-Gut Health Companion
            </p>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-white text-[#0F766E] shadow-[0_12px_30px_rgba(15,118,110,0.10)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
        </motion.section>

        <motion.section variants={cardVariants} className="muna-soft-card overflow-hidden rounded-[1.35rem] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#ff7a1a] shadow-sm">
                <Flame className="h-6 w-6 fill-current" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-black text-[#065F46]">3 Day Improvement Streak</p>
                <p className="mt-0.5 text-sm font-semibold leading-6 text-slate-600">
                  Keep it up! Your consistency is paying off.
                </p>
              </div>
            </div>
            <Sparkles className="h-5 w-5 shrink-0 text-[#10B981]" aria-hidden="true" />
          </div>
        </motion.section>

        <motion.div variants={cardVariants}>
          <Link
            href="/ai-chat"
            className="flex min-h-16 items-center justify-between gap-4 rounded-[1.35rem] bg-[#0F766E] px-5 py-4 text-white shadow-[0_18px_44px_rgba(15,118,110,0.22)] transition hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg font-black">Ask MUNA AI</span>
                <span className="block text-sm font-semibold text-emerald-50">
                  Brain-gut questions, flare tips, and tracking support
                </span>
              </span>
            </span>
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
        </motion.div>

        <section className="grid gap-4 md:grid-cols-2">
          <ScoreCard score={stats.ibsScore} />
          <ForecastCard riskScore={stats.riskScore || 72} riskLevel="Moderate Risk" />
        </section>

        <motion.section variants={cardVariants} className="muna-card relative overflow-hidden rounded-[1.7rem] p-5 md:p-7">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#D1FAE5]/70 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_220px] md:items-center">
            <div>
              <p className="flex items-center gap-2 text-2xl font-black text-[#0F172A]">
                <Brain className="h-6 w-6 text-[#0F766E]" aria-hidden="true" />
                MUNA Intelligence
              </p>
              <div className="mt-4 space-y-2 text-base font-medium leading-7 text-slate-700">
                <p>Your symptoms have improved over the last three days.</p>
                <p>Stress appears to be your strongest trigger.</p>
                <p>Continue hydration and avoid garlic today.</p>
              </div>
            </div>
            <div className="relative mx-auto h-44 w-44">
              <div className="absolute inset-0 rounded-full bg-[#ECFDF5]" />
              <motion.div
                className="absolute inset-4 grid place-items-center rounded-[2rem] bg-gradient-to-br from-[#0F766E] to-[#10B981] text-white shadow-lg"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Bot className="h-16 w-16" aria-hidden="true" />
              </motion.div>
              <Sparkles className="absolute right-2 top-5 h-6 w-6 text-[#10B981]" aria-hidden="true" />
              <Leaf className="absolute bottom-4 left-2 h-6 w-6 text-[#0F766E]" aria-hidden="true" />
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.section variants={cardVariants} className="muna-card rounded-[1.7rem] p-5">
            <h2 className="text-xl font-black text-[#0F172A]">Today&apos;s Recovery Plan</h2>
            <div className="mt-4 grid gap-3">
              {recoveryPlan.map((item) => (
                <motion.div key={item} className="flex items-center gap-3" whileHover={{ x: 4 }}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10B981] text-white">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-[#0F172A]">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={cardVariants} className="muna-card rounded-[1.7rem] p-5">
            <h2 className="text-xl font-black text-[#0F172A]">Log Your Day</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Meals", href: "/add-meal", icon: Leaf },
                { label: "Symptoms", href: "/add-symptoms", icon: Brain },
                { label: "Bowel", href: "/bowel-movement", icon: Sparkles },
                { label: "Water", href: "/water", icon: Droplets },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={item.href} className="rounded-2xl bg-[#ECFDF5] p-4 text-center font-bold text-[#065F46]">
                    <Icon className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.section>
        </section>

        <motion.section variants={cardVariants}>
          <h2 className="mb-4 text-xl font-black text-[#0F172A]">Today&apos;s Health Snapshot</h2>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {snapshotItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  className="rounded-[1.35rem] border border-emerald-100 bg-white p-3 text-center shadow-[0_14px_34px_rgba(15,118,110,0.08)]"
                  whileHover={{ y: -4 }}
                >
                  <Icon className={`mx-auto h-7 w-7 ${item.tint}`} aria-hidden="true" />
                  <p className="mt-2 text-xs font-bold text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-[#0F172A]">{item.value}</p>
                  <p className="mt-0.5 text-xs font-bold text-[#10B981]">{item.status}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section variants={cardVariants} className="muna-card rounded-[1.7rem] p-5 md:p-6">
          <h2 className="text-xl font-black text-[#0F172A]">Seven Day Gut Trend</h2>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#ECFDF5" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis domain={[50, 100]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid #D1FAE5",
                    boxShadow: "0 18px 50px rgba(15,118,110,0.12)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10B981"
                  strokeWidth={4}
                  dot={{ r: 5, fill: "#10B981", strokeWidth: 3, stroke: "#ffffff" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section variants={cardVariants} className="muna-card rounded-[1.7rem] p-5 md:p-6">
          <h2 className="text-xl font-black text-[#0F172A]">Top Triggers</h2>
          <div className="mt-6 space-y-5">
            {triggers.map((trigger) => (
              <div key={trigger.label}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-bold text-slate-700">{trigger.label}</p>
                  <p className="text-sm font-bold text-[#0F766E]">{trigger.value}%</p>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-[#ECFDF5]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#0F766E] to-[#10B981]"
                    initial={{ width: 0 }}
                    animate={{ width: `${trigger.value}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={cardVariants} className="muna-dark-panel rounded-[1.7rem] p-6">
          <p className="text-2xl font-black">The Future of Brain-Gut Health</p>
          <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-emerald-50">
            AI-powered insights. Personalised for you. Backed by science.
          </p>
          <div className="mt-5 h-1 w-16 rounded-full bg-[#10B981]" />
        </motion.section>
      </motion.div>

      <BottomNavigation />
    </AppShell>
  );
}

function ScoreCard({ score }: { score: number }) {
  return (
    <motion.div variants={cardVariants} className="muna-card rounded-[1.7rem] p-5" whileHover={{ y: -5 }}>
      <p className="text-base font-black text-[#0F172A]">Gut Health Score</p>
      <div className="mt-4 flex items-center justify-center">
        <CircularProgress value={score} />
      </div>
      <p className="mx-auto mt-3 w-fit rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-black text-[#0F766E]">
        Stable Today
      </p>
    </motion.div>
  );
}

function ForecastCard({ riskScore, riskLevel }: { riskScore: number; riskLevel: string }) {
  return (
    <motion.div
      variants={cardVariants}
      className="muna-card relative overflow-hidden rounded-[1.7rem] p-5"
      whileHover={{ y: -5 }}
    >
      <div className="absolute inset-x-0 bottom-0 h-24 opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="risk" stroke="#10B981" strokeWidth={3} fill="url(#forecastFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="relative">
        <p className="text-base font-black text-[#0F172A]">Tomorrow&apos;s Gut Forecast</p>
        <p className="mt-4 w-fit rounded-full bg-orange-100 px-3 py-1 text-lg font-black text-orange-500">
          {riskLevel}
        </p>
        <div className="mt-5 flex justify-end">
          <div className="grid h-28 w-28 place-items-center rounded-full border-[10px] border-orange-300 bg-white shadow-sm">
            <p className="text-3xl font-black text-orange-500">{riskScore}%</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#D1FAE5" strokeWidth="14" />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#16A34A"
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
          <p className="text-5xl font-black text-[#16A34A]">{value}</p>
          <p className="text-sm font-black text-[#0F172A]">/100</p>
        </div>
      </div>
    </div>
  );
}

function BottomNavigation() {
  const items = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Diary", href: "/add-meal", icon: NotebookPen },
    { label: "+", href: "/add-symptoms", icon: CirclePlus, primary: true },
    { label: "Insights", href: "/trigger-analysis", icon: Sparkles },
    { label: "Profile", href: "/settings", icon: UserRound },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/90 px-3 py-2 shadow-[0_-18px_50px_rgba(15,118,110,0.12)] backdrop-blur-xl no-print md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-black text-[#065F46]"
            >
              <span
                className={
                  item.primary
                    ? "grid h-14 w-14 -translate-y-4 place-items-center rounded-full bg-[#10B981] text-white shadow-[0_12px_30px_rgba(16,185,129,0.35)]"
                    : "grid h-8 w-8 place-items-center rounded-full text-[#0F766E]"
                }
              >
                <Icon className={item.primary ? "h-7 w-7" : "h-5 w-5"} aria-hidden="true" />
              </span>
              <span className={item.primary ? "-mt-4 text-[#0F766E]" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
