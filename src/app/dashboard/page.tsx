"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Area,
  AreaChart,
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
  Bot,
  Brain,
  Check,
  CirclePlus,
  Home,
  NotebookPen,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { calculateRisk } from "@/lib/risk";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";

type DashboardStats = {
  userName: string;
  gutScore: number;
  flareRisk: "Low" | "Medium" | "High";
  confidence: number;
  pain: number;
  bloating: number;
  stress: number;
  sleepHours: number;
  waterLiters: number;
  bristolType: number;
};

const variants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const trendData = [
  { day: "Mon", gut: 72, sleep: 6.4, stress: 6, pain: 4 },
  { day: "Tue", gut: 76, sleep: 6.9, stress: 5, pain: 3 },
  { day: "Wed", gut: 80, sleep: 7.2, stress: 4, pain: 3 },
  { day: "Thu", gut: 84, sleep: 7.5, stress: 3, pain: 2 },
  { day: "Fri", gut: 82, sleep: 7.1, stress: 4, pain: 2 },
  { day: "Sat", gut: 86, sleep: 7.8, stress: 3, pain: 1 },
  { day: "Sun", gut: 84, sleep: 7.5, stress: 3, pain: 2 },
];

const weeklyCards = [
  { label: "Gut Score", value: "████████", tone: "text-[#10B981]" },
  { label: "Sleep", value: "███████", tone: "text-violet-500" },
  { label: "Stress", value: "████", tone: "text-orange-500" },
  { label: "Pain", value: "███", tone: "text-rose-500" },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    userName: "Shuvam",
    gutScore: 84,
    flareRisk: "Low",
    confidence: 89,
    pain: 2,
    bloating: 3,
    stress: 3,
    sleepHours: 7.5,
    waterLiters: 2.1,
    bristolType: 4,
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

      const userName =
        user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Shuvam";

      const today = new Date().toISOString().slice(0, 10);

      const { data: latestSymptom } = await supabase
        .from("symptoms")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: latestBowel } = await supabase
        .from("bowel_movements")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: waterLogs } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", today);

      const { data: latestSleep } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const pain = Number(latestSymptom?.pain_level ?? latestSymptom?.severity ?? 2);
      const bloating = Number(latestSymptom?.bloating_level ?? 3);
      const stress = Number(latestSymptom?.stress_level ?? 3);
      const bristolType = Number(latestBowel?.bristol_type ?? 4);
      const sleepHours = Number(latestSleep?.hours ?? 7.5);
      const waterTotal =
        waterLogs?.reduce((sum, row) => sum + Number(row.amount_ml || row.cups * 240 || 0), 0) || 2100;
      const waterLiters = waterTotal / 1000;

      const risk = calculateRisk({
        painLevel: pain,
        stressLevel: stress,
        waterToday: waterTotal,
        waterGoal: 2400,
        sleepHours,
        hasHighFodmapMeal: false,
        bristolType,
      });

      let gutScore = 100 - pain * 4 - bloating * 3 - Math.max(0, stress - 3) * 4;
      if (sleepHours < 7) gutScore -= 8;
      if (waterLiters < 1.8) gutScore -= 6;
      if (![3, 4, 5].includes(bristolType)) gutScore -= 8;
      gutScore = Math.max(0, Math.min(100, Math.round(gutScore)));

      setStats({
        userName,
        gutScore,
        flareRisk: risk.score >= 55 ? "High" : risk.score >= 30 ? "Medium" : "Low",
        confidence: 89,
        pain,
        bloating,
        stress,
        sleepHours,
        waterLiters,
        bristolType,
      });
    }

    loadDashboard();
  }, []);

  const positiveHabits = useMemo(
    () => [
      `Slept ${stats.sleepHours.toFixed(1)} hrs`,
      stats.stress <= 4 ? "Low stress" : "Stress awareness logged",
      stats.waterLiters >= 1.8 ? "Good hydration" : "Hydration started",
      "Walk completed",
    ],
    [stats]
  );

  const possibleTriggers = ["Dairy yesterday", "Coffee after 6 PM"];
  const aiInsights = [
    "Stress has increased slightly compared with your best days",
    "Stool consistency is improving",
    "Lunch appears safe based on recent symptom timing",
    "Water intake still needs a small boost",
  ];

  return (
    <AppShell title="Dashboard" hidePageHeader showDefaultBottomNav={false}>
      <motion.main
        className="mx-auto max-w-6xl space-y-5 pb-28"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.section variants={variants} className="flex items-start justify-between gap-4">
          <div>
            <p className="text-3xl font-black text-[#0F172A] md:text-5xl">
              {greeting()} {stats.userName} <span aria-hidden="true">👋</span>
            </p>
            <p className="mt-2 text-base font-bold text-slate-600">
              Your AI Brain-Gut Health Companion
            </p>
          </div>
          <Link
            href="/ai-chat"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-[#0F766E] text-white shadow-[0_18px_44px_rgba(15,118,110,0.25)]"
            aria-label="Ask MUNA AI"
          >
            <Bot className="h-7 w-7" aria-hidden="true" />
          </Link>
        </motion.section>

        <motion.section variants={variants} className="muna-card overflow-hidden rounded-[2rem] p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#10B981]">Your Gut Score</p>
              <div className="mt-4 flex items-end gap-3">
                <p className="text-7xl font-black text-[#0F766E]">{stats.gutScore}</p>
                <p className="pb-3 text-2xl font-black text-slate-400">/100</p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <MiniMetric label="Today's Flare Risk" value={`🟢 ${stats.flareRisk}`} />
                <MiniMetric label="Confidence" value={`${stats.confidence}%`} />
              </div>
            </div>
            <div className="h-64 rounded-[1.5rem] bg-[#ECFDF5] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="gut" stroke="#0F766E" strokeWidth={4} fill="url(#scoreFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 lg:grid-cols-2">
          <HabitCard title="Things helping today" icon={Check} items={positiveHabits} positive />
          <HabitCard title="Possible triggers" icon={TriangleAlert} items={possibleTriggers} />
        </section>

        <motion.section variants={variants} className="muna-dark-panel rounded-[2rem] p-6">
          <p className="text-sm font-black uppercase tracking-wide text-[#10B981]">MUNA Prediction</p>
          <p className="mt-3 text-3xl font-black text-white">
            Tomorrow is likely to be a {stats.flareRisk.toUpperCase()} symptom day.
          </p>
          <p className="mt-4 text-sm font-semibold text-emerald-50">
            Confidence {stats.confidence}% based on today&apos;s sleep, stress, water, stool pattern and symptom trend.
          </p>
        </motion.section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {weeklyCards.map((card) => (
            <motion.div key={card.label} variants={variants} className="muna-card rounded-[1.5rem] p-4">
              <p className="text-sm font-black text-slate-500">{card.label}</p>
              <p className={`mt-3 text-lg font-black tracking-widest ${card.tone}`}>{card.value}</p>
            </motion.div>
          ))}
        </section>

        <motion.section variants={variants} className="muna-card rounded-[2rem] p-5">
          <h2 className="text-2xl font-black text-[#0F172A]">Today&apos;s AI Insights</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {aiInsights.map((insight, index) => (
              <div key={insight} className="rounded-[1.35rem] bg-[#ECFDF5] p-4">
                <Brain className="h-5 w-5 text-[#0F766E]" aria-hidden="true" />
                <p className="mt-3 font-bold text-[#0F172A]">{insight}</p>
                <p className="mt-1 text-xs font-black text-[#10B981]">Insight {index + 1}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Gut Score Trend" type="line" />
          <ChartCard title="Sleep, Stress and Pain" type="bar" />
        </section>

        <motion.section variants={variants}>
          <Link
            href="/ai-chat"
            className="flex items-center justify-between rounded-[2rem] bg-[#0F766E] p-5 text-white shadow-[0_18px_44px_rgba(15,118,110,0.22)]"
          >
            <span>
              <span className="block text-xl font-black">Ask MUNA AI</span>
              <span className="mt-1 block text-sm font-semibold text-emerald-50">
                Get a personal answer from your tracked health data
              </span>
            </span>
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </Link>
        </motion.section>
      </motion.main>

      <BottomNavigation />
    </AppShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] bg-[#ECFDF5] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#065F46]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#0F172A]">{value}</p>
    </div>
  );
}

function HabitCard({
  title,
  icon: Icon,
  items,
  positive = false,
}: {
  title: string;
  icon: typeof Check;
  items: string[];
  positive?: boolean;
}) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${positive ? "bg-[#D1FAE5] text-[#0F766E]" : "bg-orange-100 text-orange-600"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-black text-[#0F172A]">{title}</h2>
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <p key={item} className="font-bold text-slate-700">
            {positive ? "✓" : "⚠"} {item}
          </p>
        ))}
      </div>
    </motion.section>
  );
}

function ChartCard({ title, type }: { title: string; type: "line" | "bar" }) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
        <h2 className="text-xl font-black text-[#0F172A]">{title}</h2>
      </div>
      <div className="mt-5 h-60">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={trendData}>
              <CartesianGrid stroke="#ECFDF5" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="gut" stroke="#0F766E" strokeWidth={4} dot={false} />
            </LineChart>
          ) : (
            <BarChart data={trendData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="sleep" fill="#10B981" radius={[10, 10, 0, 0]} />
              <Bar dataKey="stress" fill="#F59E0B" radius={[10, 10, 0, 0]} />
              <Bar dataKey="pain" fill="#F43F5E" radius={[10, 10, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

function BottomNavigation() {
  const items = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Diary", href: "/add-meal", icon: NotebookPen },
    { label: "+", href: "/add-symptoms", icon: CirclePlus, primary: true },
    { label: "MUNA AI", href: "/ai-chat", icon: Bot },
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
