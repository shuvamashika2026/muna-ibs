"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  Award,
  Bot,
  Brain,
  Check,
  CirclePlus,
  Droplets,
  Home,
  Mic,
  Moon,
  NotebookPen,
  ShieldCheck,
  Sparkles,
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

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
};

const variants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.46, ease: "easeOut" } },
};

const trendData = [
  { day: "Mon", gut: 72, stress: 6, sleep: 6.4, water: 1.5, bristol: 3 },
  { day: "Tue", gut: 76, stress: 5, sleep: 6.9, water: 1.7, bristol: 4 },
  { day: "Wed", gut: 80, stress: 4, sleep: 7.2, water: 1.9, bristol: 4 },
  { day: "Thu", gut: 84, stress: 3, sleep: 7.5, water: 2.1, bristol: 4 },
  { day: "Fri", gut: 82, stress: 4, sleep: 7.1, water: 1.8, bristol: 5 },
  { day: "Sat", gut: 86, stress: 3, sleep: 7.8, water: 2.2, bristol: 4 },
  { day: "Sun", gut: 84, stress: 3, sleep: 7.5, water: 2.1, bristol: 4 },
];

const badges = [
  { label: "3-day streak", detail: "Consistent logs", icon: Award },
  { label: "Hydration lift", detail: "+18% this week", icon: Droplets },
  { label: "Sleep stable", detail: "7h+ average", icon: Moon },
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

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

  const brainGutBalance = Math.round((stats.gutScore + (10 - stats.stress) * 10 + stats.sleepHours * 10) / 3);
  const actionPlan = [
    `Drink ${(2.4 - stats.waterLiters > 0 ? 2.4 - stats.waterLiters : 0.3).toFixed(1)}L more water`,
    "10-minute calming breathwork",
    "Low-FODMAP dinner choice",
    "Walk gently after dinner",
  ];
  const communityMetrics = [
    "95,000+ IBS community members for early testing",
    "Most common weekly trigger: stress + poor sleep",
    "Members report lower symptoms on 7h+ sleep days",
  ];

  function startVoiceAsk() {
    const speechWindow = window as WindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      window.location.href = "/ai-chat";
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    setIsListening(true);

    let transcript = "";
    recognition.onresult = (event) => {
      transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
    };
    recognition.onerror = () => {
      setIsListening(false);
      window.location.href = "/ai-chat";
    };
    recognition.onend = () => {
      setIsListening(false);
      if (transcript) {
        localStorage.setItem("munaDashboardVoicePrompt", transcript);
      }
      window.location.href = "/ai-chat";
    };
    recognition.start();
  }

  return (
    <AppShell title="Dashboard" hidePageHeader showDefaultBottomNav={false}>
      <motion.main
        className="mx-auto max-w-7xl space-y-5 pb-28"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      >
        <motion.section variants={variants} className="relative overflow-hidden rounded-[2.25rem] p-6 md:p-8 muna-dark-panel">
          <div className="absolute right-[-4rem] top-[-5rem] h-64 w-64 rounded-full bg-[#10B981]/25 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#10B981]">MUNA AI Health Dashboard</p>
              <h1 className="mt-3 text-4xl font-black tracking-normal text-white md:text-6xl">
                {greeting()}, {stats.userName} <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-emerald-50">
                Your brain-gut intelligence layer for flare prediction, positive habits, personal triggers,
                and daily coaching.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-4 backdrop-blur-2xl">
              <p className="text-sm font-bold text-emerald-50">AI status</p>
              <p className="mt-2 text-2xl font-black text-white">Personalized from today&apos;s logs</p>
              <p className="mt-2 text-sm font-semibold text-emerald-100">Updated just now</p>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.85fr_0.85fr]">
          <GutScoreCard score={stats.gutScore} />
          <FlareRiskGauge risk={stats.flareRisk} confidence={stats.confidence} />
          <BrainGutBalance value={brainGutBalance} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <AiInsightCard stats={stats} />
          <ActionPlanCard items={actionPlan} />
        </section>

        <WeeklyTrends />

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <AchievementBadges />
          <CommunityInsights items={communityMetrics} />
        </section>
      </motion.main>

      <FloatingAskMuna isListening={isListening} onClick={startVoiceAsk} />
      <BottomNavigation />
    </AppShell>
  );
}

function GutScoreCard({ score }: { score: number }) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Gut Health Score</p>
          <p className="mt-3 text-7xl font-black text-[#0F766E]">{score}</p>
          <p className="text-lg font-black text-slate-400">/100</p>
        </div>
        <ShieldCheck className="h-9 w-9 text-[#10B981]" aria-hidden="true" />
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#D1FAE5]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#0F766E] to-[#10B981]"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
        Stable pattern today. Hydration and sleep are supporting your gut rhythm.
      </p>
    </motion.section>
  );
}

function FlareRiskGauge({ risk, confidence }: { risk: string; confidence: number }) {
  const riskValue = risk === "High" ? 76 : risk === "Medium" ? 54 : 22;

  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-6">
      <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Today&apos;s Flare Risk</p>
      <div className="mt-6 grid place-items-center">
        <div className="relative h-40 w-40">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
            <circle cx="70" cy="70" r="54" fill="none" stroke="#ECFDF5" strokeWidth="16" />
            <motion.circle
              cx="70"
              cy="70"
              r="54"
              fill="none"
              stroke={risk === "High" ? "#F97316" : risk === "Medium" ? "#F59E0B" : "#10B981"}
              strokeLinecap="round"
              strokeWidth="16"
              strokeDasharray={339.29}
              initial={{ strokeDashoffset: 339.29 }}
              animate={{ strokeDashoffset: 339.29 - (riskValue / 100) * 339.29 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-3xl font-black text-[#0F172A]">{risk}</p>
              <p className="text-xs font-black text-[#10B981]">{confidence}% confidence</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function BrainGutBalance({ value }: { value: number }) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Brain-Gut Balance</p>
        <Brain className="h-8 w-8 text-[#10B981]" aria-hidden="true" />
      </div>
      <p className="mt-5 text-5xl font-black text-[#0F172A]">{value}%</p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {["Mind", "Gut", "Routine"].map((item, index) => (
          <div key={item} className="rounded-2xl bg-[#ECFDF5] p-3 text-center">
            <p className="text-xs font-black text-slate-500">{item}</p>
            <p className="mt-1 text-lg font-black text-[#0F766E]">{[82, 86, 78][index]}%</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function AiInsightCard({ stats }: { stats: DashboardStats }) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">AI Insight of the Day</p>
          <h2 className="text-2xl font-black text-[#0F172A]">Your nervous system looks calmer today</h2>
        </div>
      </div>
      <p className="mt-5 text-base font-semibold leading-7 text-slate-600">
        MUNA sees low stress, {stats.sleepHours.toFixed(1)} hours of sleep, and Bristol type {stats.bristolType}.
        These are usually supportive signals for a lower symptom day. Keep dinner simple and avoid late caffeine.
      </p>
      <Link
        href="/ai-chat"
        className="mt-5 inline-flex rounded-2xl bg-[#0F766E] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(15,118,110,0.22)]"
      >
        Ask MUNA to explain
      </Link>
    </motion.section>
  );
}

function ActionPlanCard({ items }: { items: string[] }) {
  return (
    <motion.section variants={variants} className="muna-soft-card rounded-[2rem] p-6">
      <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Today&apos;s Action Plan</p>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <motion.div key={item} className="flex items-center gap-3 rounded-2xl bg-white/75 p-4" whileHover={{ x: 4 }}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#10B981] text-white">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="font-bold text-[#0F172A]">{item}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function WeeklyTrends() {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Weekly Trends</p>
          <h2 className="text-2xl font-black text-[#0F172A]">Gut score, stress, sleep, water and Bristol</h2>
        </div>
        <p className="text-sm font-bold text-slate-500">7-day investor demo view</p>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="h-72 rounded-[1.5rem] bg-[#ECFDF5] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid stroke="#D1FAE5" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="gut" stroke="#0F766E" strokeWidth={4} dot={false} />
              <Line type="monotone" dataKey="sleep" stroke="#8B5CF6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="water" stroke="#0EA5E9" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72 rounded-[1.5rem] bg-white/70 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="stress" fill="#F59E0B" radius={[10, 10, 0, 0]} />
              <Bar dataKey="bristol" fill="#10B981" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.section>
  );
}

function AchievementBadges() {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-6">
      <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Achievement Badges</p>
      <div className="mt-5 grid gap-3">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <div key={badge.label} className="flex items-center gap-3 rounded-[1.25rem] bg-[#ECFDF5] p-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#0F766E] shadow-sm">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-black text-[#0F172A]">{badge.label}</p>
                <p className="text-sm font-semibold text-slate-500">{badge.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function CommunityInsights({ items }: { items: string[] }) {
  return (
    <motion.section variants={variants} className="muna-dark-panel rounded-[2rem] p-6">
      <p className="text-sm font-black uppercase tracking-wide text-[#10B981]">Community Insights</p>
      <h2 className="mt-2 text-3xl font-black text-white">Built with a ready IBS community</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <p key={item} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-emerald-50">
            {item}
          </p>
        ))}
      </div>
    </motion.section>
  );
}

function FloatingAskMuna({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-5 z-40 flex items-center gap-3 rounded-full bg-[#0F766E] px-4 py-3 text-white shadow-[0_20px_50px_rgba(15,118,110,0.35)] md:bottom-8"
      aria-label="Ask MUNA with voice"
    >
      <span className="relative grid h-12 w-12 place-items-center rounded-full bg-[#10B981]">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-[#10B981]"
          animate={isListening ? { scale: [1, 1.5], opacity: [0.8, 0] } : { scale: [1, 1.22], opacity: [0.28, 0] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
        {isListening ? (
          <span className="relative flex h-7 items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((bar) => (
              <motion.span
                key={bar}
                className="w-1.5 rounded-full bg-white"
                animate={{ height: [9, 24, 12, 20, 9] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: bar * 0.1 }}
              />
            ))}
          </span>
        ) : (
          <Mic className="relative h-6 w-6" aria-hidden="true" />
        )}
      </span>
      <span className="hidden pr-2 text-left sm:block">
        <span className="block text-sm font-black">Ask MUNA</span>
        <span className="block text-xs font-semibold text-emerald-50">Voice ready</span>
      </span>
    </button>
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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-100 bg-white/90 px-3 py-2 shadow-[0_-18px_50px_rgba(15,118,110,0.12)] backdrop-blur-xl no-print md:hidden">
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
