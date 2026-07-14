"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
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
  BookOpen,
  Bot,
  Brain,
  Check,
  CirclePlus,
  ArrowRight,
  Droplets,
  Home,
  Mic,
  Moon,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { calculateRisk } from "@/lib/risk";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";
import { FoodIntelligenceCard } from "@/components/dashboard/FoodIntelligenceCard";
import { DailyBriefCard } from "@/components/dashboard/DailyBriefCard";
import { ExperimentModeCard } from "@/components/experiment/experiment-mode-card";
import {
  buildDashboardFoodInsight,
  type DashboardFoodInsight,
} from "@/lib/food-intelligence";
import type { DailyBrief } from "@/lib/daily-brief";
import type { Experiment } from "@/lib/experiment-engine";
import type { ExperimentProgress } from "@/lib/experiment-progress";
import { generateInsightsFromApi } from "@/lib/insights/api-client";

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
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [completedJourneySteps, setCompletedJourneySteps] = useState<string[]>([]);
  const [todayMood, setTodayMood] = useState<"Better" | "About the same" | "Worse" | null>(null);
  const [isWeeklyProgressOpen, setIsWeeklyProgressOpen] = useState(false);
  const [foodInsight, setFoodInsight] = useState<DashboardFoodInsight | null>(null);
  const [isFoodInsightLoading, setIsFoodInsightLoading] = useState(true);
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null);
  const [isDailyBriefLoading, setIsDailyBriefLoading] = useState(true);
  const [dailyBriefError, setDailyBriefError] = useState<string | null>(null);
  const [experimentSummary, setExperimentSummary] = useState<Experiment | null>(null);
  const [experimentProgress, setExperimentProgress] = useState<ExperimentProgress | null>(null);
  const [isExperimentLoading, setIsExperimentLoading] = useState(true);
  const [experimentError, setExperimentError] = useState<string | null>(null);
  const [isInsightTestLoading, setIsInsightTestLoading] = useState(false);
  const [insightTestStatus, setInsightTestStatus] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!supabase) {
        setIsFoodInsightLoading(false);
        setIsDailyBriefLoading(false);
        setIsExperimentLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setIsFoodInsightLoading(false);
        setIsDailyBriefLoading(false);
        setIsExperimentLoading(false);
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
        .eq("logged_on", today);

      const { data: latestSleep } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: meals } = await supabase
        .from("meals")
        .select("foods, notes, meal_type, eaten_at, created_at")
        .eq("user_id", user.id)
        .order("eaten_at", { ascending: false })
        .limit(20);

      const { data: symptoms } = await supabase
        .from("symptoms")
        .select("symptoms, severity, stress_level, logged_at, created_at")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(20);

      setFoodInsight(buildDashboardFoodInsight(meals ?? [], symptoms ?? []));
      setIsFoodInsightLoading(false);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (accessToken) {
        try {
          const briefResponse = await fetch("/api/daily-brief", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (briefResponse.ok) {
            const payload = (await briefResponse.json()) as { brief?: DailyBrief };
            setDailyBrief(payload.brief ?? null);
            setDailyBriefError(null);
          } else {
            setDailyBriefError("Daily brief is unavailable right now.");
          }
        } catch {
          setDailyBriefError("Daily brief is unavailable right now.");
        }
      } else {
        setDailyBriefError("Sign in to receive your daily brief.");
      }

      setIsDailyBriefLoading(false);

      if (accessToken) {
        try {
          const experimentResponse = await fetch("/api/experiments", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (experimentResponse.ok) {
            const experimentPayload = (await experimentResponse.json()) as {
              experiment?: Experiment | null;
              progress?: ExperimentProgress | null;
            };
            setExperimentSummary(experimentPayload.experiment ?? null);
            setExperimentProgress(experimentPayload.progress ?? null);
            setExperimentError(null);
          } else {
            setExperimentError("Experiment status is unavailable right now.");
          }
        } catch {
          setExperimentError("Experiment status is unavailable right now.");
        }
      } else {
        setExperimentError("Sign in to use Experiment Mode.");
      }

      setIsExperimentLoading(false);

      const pain = Number(latestSymptom?.severity ?? 2);
      const bloating = Number(latestSymptom?.severity ?? 3);
      const stress = Number(latestSymptom?.stress_level ?? 3);
      const bristolType = Number(latestBowel?.bristol_type ?? 4);
      const sleepHours = Number(latestSleep?.hours ?? 7.5);
      const waterTotal =
        waterLogs?.reduce((sum, row) => sum + Number(row.cups || 0) * 250, 0) || 2100;
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
    "Learning patterns takes time, and small daily check-ins can make your story easier to understand.",
    "Your logs can help you prepare clearer conversations with qualified healthcare professionals.",
    "Gentle routines, regular meals, sleep, and hydration are common foundations for daily self-awareness.",
  ];
  const dailyFocus =
    stats.stress >= 6
      ? "Calm your nervous system before meals"
      : stats.sleepHours < 7
        ? "Protect sleep recovery tonight"
        : stats.waterLiters < 1.8
          ? "Build steady hydration"
          : "Keep your gut rhythm steady";
  const dailyLesson =
    stats.stress >= 6
      ? "Stress can amplify gut sensitivity through the brain-gut connection. A short reset before dinner may help you notice patterns calmly."
      : "Small repeated habits like hydration, gentle movement, sleep, and simple meals can support a steadier brain-gut routine.";
  const journeySteps = [
    {
      id: "reset",
      title: "Brain-Gut Reset",
      detail: "Start with a calm reset for breath, focus, body awareness, and reflection.",
      href: "/brain-gut-reset",
      icon: Brain,
    },
    {
      id: "lesson",
      title: "Daily Lesson",
      detail: dailyLesson,
      icon: BookOpen,
    },
    {
      id: "focus",
      title: "Today's Focus",
      detail: dailyFocus,
      icon: Target,
    },
    {
      id: "reflection",
      title: "Evening Reflection",
      detail: "Come back tonight and note what helped, what felt hard, and what you want to repeat.",
      icon: Moon,
    },
  ];
  const journeyProgress = Math.round((completedJourneySteps.length / journeySteps.length) * 100);

  function toggleJourneyStep(stepId: string) {
    setJourneyStarted(true);
    setCompletedJourneySteps((current) =>
      current.includes(stepId) ? current.filter((item) => item !== stepId) : [...current, stepId]
    );
  }

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

  async function handleTestInsightGeneration() {
    setIsInsightTestLoading(true);
    setInsightTestStatus(null);

    const result = await generateInsightsFromApi({
      force: true,
      observationWindowDays: 14,
    });

    if (!result.ok) {
      setInsightTestStatus(result.message);
      setIsInsightTestLoading(false);
      return;
    }

    console.log("Insight API test response:", result.data);

    const count = result.data.activeInsights.length;
    setInsightTestStatus(
      `Success: ${count} active insight${count === 1 ? "" : "s"} returned (${result.data.actionableInsights.length} actionable).`
    );
    setIsInsightTestLoading(false);
  }

  return (
    <AppShell title="Dashboard" hidePageHeader showDefaultBottomNav={false}>
      <motion.main
        className="mx-auto max-w-7xl space-y-5 pb-28"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      >
        <CoachingHero stats={stats} />
        <motion.div variants={variants}>
          <DailyBriefCard brief={dailyBrief} isLoading={isDailyBriefLoading} error={dailyBriefError} />
        </motion.div>
        <motion.div variants={variants}>
          <ExperimentModeCard
            experiment={experimentSummary}
            progress={experimentProgress}
            isLoading={isExperimentLoading}
            error={experimentError}
          />
        </motion.div>
        <motion.section
          variants={variants}
          className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-4 ring-1 ring-amber-200"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-900">
            Temporary Development Test
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Authenticated POST to /api/insights (force=true, 14-day window). Check the browser console for the full
            response.
          </p>
          <button
            type="button"
            onClick={handleTestInsightGeneration}
            disabled={isInsightTestLoading}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-amber-800 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isInsightTestLoading ? "Generating insights…" : "Test Insight Generation"}
          </button>
          {insightTestStatus ? (
            <p
              className={`mt-3 text-sm font-semibold ${
                insightTestStatus.startsWith("Success:") ? "text-emerald-800" : "text-rose-700"
              }`}
            >
              {insightTestStatus}
            </p>
          ) : null}
        </motion.section>
        <TodaysCheckInCard mood={todayMood} onSelectMood={setTodayMood} />

        <section className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
          <TodaysJourneySection
            journeyStarted={journeyStarted}
            progress={journeyProgress}
            completedSteps={completedJourneySteps}
            steps={journeySteps}
            onStart={() => setJourneyStarted(true)}
            onToggleStep={toggleJourneyStep}
          />
          <HealthSnapshotCard stats={stats} />
        </section>

        <section className="pt-2">
          <div className="mb-4">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0F766E]">Trackers and insights</p>
            <h2 className="mt-2 text-3xl font-black tracking-normal text-[#0F172A]">Your existing MUNA trackers</h2>
          </div>
          <motion.div variants={variants} className="mb-4">
            <FoodIntelligenceCard
              insight={
                foodInsight ?? {
                  hasPattern: false,
                  observation:
                    "Keep logging meals and symptoms. MUNA needs repeated observations before it can identify a meaningful personal pattern.",
                  limitation: "",
                  experiment: "",
                  linkHref: "/add-meal",
                  linkLabel: "Log a meal",
                }
              }
              isLoading={isFoodInsightLoading}
            />
          </motion.div>
          <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr_0.85fr]">
            <GutScoreCard score={stats.gutScore} />
            <FlareRiskGauge risk={stats.flareRisk} confidence={stats.confidence} />
            <BrainGutBalance value={brainGutBalance} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <DailyCoachCard stats={stats} />
          <ActionPlanCard items={actionPlan} />
        </section>

        <WeeklyProgressSection isOpen={isWeeklyProgressOpen} onToggle={() => setIsWeeklyProgressOpen((value) => !value)} />

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

function CoachingHero({ stats }: { stats: DashboardStats }) {
  return (
    <motion.section variants={variants} className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-[0_18px_56px_rgba(15,118,110,0.10)] ring-1 ring-emerald-100 md:p-6">
      <div className="absolute right-[-4rem] top-[-6rem] h-52 w-52 rounded-full bg-[#D1FAE5] blur-3xl" />
      <div className="relative grid gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0F766E]">MUNA Coaching</p>
          <h1 className="mt-2 text-4xl font-black tracking-normal text-[#0F172A] md:text-5xl">
            {greeting()}, {stats.userName}
          </h1>
          <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">
            Today, let&apos;s calm the brain-gut loop with one focus, one lesson, and one simple action.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-[#ECFDF5] p-3">
          <HeroMetric label="Gut score" value={`${stats.gutScore}/100`} />
          <HeroMetric label="Risk" value={stats.flareRisk} />
          <HeroMetric label="Sleep" value={`${stats.sleepHours.toFixed(1)}h`} />
          <HeroMetric label="Stress" value={`${stats.stress}/10`} />
        </div>
      </div>
    </motion.section>
  );
}

function TodaysCheckInCard({
  mood,
  onSelectMood,
}: {
  mood: "Better" | "About the same" | "Worse" | null;
  onSelectMood: (mood: "Better" | "About the same" | "Worse") => void;
}) {
  const options = [
    { label: "Better", face: "😊" },
    { label: "About the same", face: "😐" },
    { label: "Worse", face: "😣" },
  ] as const;

  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0F766E]">Today&apos;s Check-in</p>
          <h2 className="mt-2 text-2xl font-black text-[#0F172A]">How does your gut feel today?</h2>
        </div>
        {mood ? <p className="rounded-full bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#0F766E]">Mood: {mood}</p> : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = mood === option.label;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onSelectMood(option.label)}
              className={`min-h-16 rounded-2xl px-4 py-3 text-left text-base font-black transition ${
                isSelected
                  ? "bg-[#0F766E] text-white shadow-[0_14px_34px_rgba(15,118,110,0.22)]"
                  : "bg-[#ECFDF5] text-[#0F172A] hover:bg-[#D1FAE5]"
              }`}
            >
              <span className="mr-2" aria-hidden="true">{option.face}</span>
              {option.label}
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-[#0F766E]">{value}</p>
    </div>
  );
}

function TodaysJourneySection({
  journeyStarted,
  progress,
  completedSteps,
  steps,
  onStart,
  onToggleStep,
}: {
  journeyStarted: boolean;
  progress: number;
  completedSteps: string[];
  steps: {
    id: string;
    title: string;
    detail: string;
    href?: string;
    icon: ElementType;
  }[];
  onStart: () => void;
  onToggleStep: (stepId: string) => void;
}) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0F766E]">Today&apos;s Journey</p>
          <h2 className="mt-2 text-3xl font-black tracking-normal text-[#0F172A]">Your guided daily coaching flow</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            Complete a simple four-step rhythm: reset, learn, focus, and reflect. Progress is stored only on this screen for now.
          </p>
        </div>
        <div className="rounded-[1.5rem] bg-[#ECFDF5] p-4 text-center">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Progress</p>
          <p className="mt-1 text-3xl font-black text-[#0F766E]">{completedSteps.length}/4</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-5 flex min-h-16 w-full items-center justify-between rounded-[1.6rem] bg-gradient-to-r from-[#0F766E] via-[#10B981] to-[#0F766E] px-5 py-4 text-left text-base font-black text-white shadow-[0_20px_50px_rgba(15,118,110,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(15,118,110,0.34)]"
      >
        <span>
          <span className="block">Start Today&apos;s Journey</span>
          <span className="mt-1 block text-xs font-semibold text-emerald-50">4 steps · about 6 minutes</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
      </button>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
          <span>{journeyStarted ? "Journey active" : "Not started"}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-emerald-50">
          <motion.div
            className="h-3 rounded-full bg-gradient-to-r from-[#0F766E] to-[#10B981]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {steps.map((step, index) => (
          <JourneyStepCard
            key={step.id}
            step={step}
            index={index}
            isComplete={completedSteps.includes(step.id)}
            onToggle={() => onToggleStep(step.id)}
          />
        ))}
      </div>
    </motion.section>
  );
}

function JourneyStepCard({
  step,
  index,
  isComplete,
  onToggle,
}: {
  step: {
    id: string;
    title: string;
    detail: string;
    href?: string;
    icon: ElementType;
  };
  index: number;
  isComplete: boolean;
  onToggle: () => void;
}) {
  const Icon = step.icon;

  return (
    <div className={`rounded-[1.5rem] p-4 ring-1 ${isComplete ? "bg-[#ECFDF5] ring-emerald-200" : "bg-white ring-emerald-100"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isComplete ? "bg-[#0F766E] text-white" : "bg-[#D1FAE5] text-[#0F766E]"}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Step {index + 1}</p>
          <h3 className="mt-1 text-lg font-black leading-6 text-[#0F172A]">{step.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{step.detail}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {step.href ? (
          <Link
            href={step.href}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-[#0F766E] px-4 py-2 text-sm font-black text-white"
          >
            Open
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl px-4 py-2 text-sm font-black ${
            isComplete ? "bg-white text-[#0F766E] ring-1 ring-emerald-100" : "bg-[#ECFDF5] text-[#0F766E]"
          }`}
        >
          {isComplete ? "Completed" : "Mark done"}
        </button>
      </div>
    </div>
  );
}

function TodaysFocusCard({ focus, stats }: { focus: string; stats: DashboardStats }) {
  return (
    <CoachCard icon={Target} eyebrow="Today's Focus" title={focus}>
      <p className="text-sm font-semibold leading-6 text-slate-600">
        Start with the signal most likely to support a calmer day: stress {stats.stress}/10, sleep{" "}
        {stats.sleepHours.toFixed(1)}h, water {stats.waterLiters.toFixed(1)}L.
      </p>
    </CoachCard>
  );
}

function BrainGutResetCard() {
  return (
    <motion.section variants={variants} className="rounded-[2rem] bg-gradient-to-br from-[#0F766E] to-[#10B981] p-5 text-white shadow-[0_22px_60px_rgba(15,118,110,0.25)]">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
          <Brain className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-50">Brain-Gut Reset</p>
          <h2 className="text-2xl font-black">3-minute calm reset</h2>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-emerald-50">
        A gentle framework for breath, focus, body awareness, and reflection.
      </p>
      <Link
        href="/brain-gut-reset"
        className="mt-5 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#0F766E]"
      >
        Start reset
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </motion.section>
  );
}

function DailyLessonCard({ lesson }: { lesson: string }) {
  return (
    <CoachCard icon={BookOpen} eyebrow="Daily Lesson" title="One thing to remember">
      <p className="text-sm font-semibold leading-6 text-slate-600">{lesson}</p>
    </CoachCard>
  );
}

function DailyActionCard({ action }: { action: string }) {
  return (
    <CoachCard icon={Check} eyebrow="Daily Action" title={action}>
      <p className="text-sm font-semibold leading-6 text-slate-600">
        Keep it small and achievable. One completed action is better than a complicated plan.
      </p>
    </CoachCard>
  );
}

function HealthSnapshotCard({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "Gut Score", value: `${stats.gutScore}/100`, icon: ShieldCheck },
    { label: "Flare Risk", value: stats.flareRisk, icon: Sparkles },
    { label: "Stress", value: `${stats.stress}/10`, icon: Brain },
    { label: "Sleep", value: `${stats.sleepHours.toFixed(1)}h`, icon: Moon },
    { label: "Water", value: `${stats.waterLiters.toFixed(1)}L`, icon: Droplets },
    { label: "Bristol", value: `Type ${stats.bristolType}`, icon: NotebookPen },
  ];

  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5 md:p-6">
      <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Health Snapshot</p>
      <h2 className="mt-2 text-2xl font-black text-[#0F172A]">Today&apos;s body signals</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[1.25rem] bg-[#ECFDF5] p-4">
              <Icon className="h-5 w-5 text-[#0F766E]" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-black text-[#0F172A]">{item.value}</p>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function CoachCard({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: ElementType;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0F766E]">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black leading-7 text-[#0F172A]">{title}</h2>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </motion.section>
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

function DailyCoachCard({ stats }: { stats: DashboardStats }) {
  const hasEnoughData = Boolean(stats.sleepHours || stats.waterLiters || stats.stress || stats.bristolType);
  const smallestStep =
    stats.waterLiters < 1.8
      ? "Before dinner, drink one additional glass of water."
      : stats.stress >= 6
        ? "Complete one Brain-Gut Reset session."
        : stats.sleepHours < 7
          ? "Choose a calmer wind-down before bed tonight."
          : "Take a 5-minute walk after dinner.";
  const encouragements = [
    "Small improvements repeated consistently create meaningful change.",
    "Every day you learn a little more about your body.",
    "Progress is built through understanding, not perfection.",
  ];
  const encouragement = encouragements[new Date().getDay() % encouragements.length];
  const summary =
    stats.sleepHours >= 7 && stats.waterLiters >= 1.8 && stats.stress <= 4
      ? "Today your routine looks stable. You slept well, stayed hydrated, and reported lower stress. These are encouraging signs."
      : "Today MUNA sees a few signals worth watching. This is not a diagnosis, but it can help you choose one small supportive step.";

  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Daily Coach</p>
          <h2 className="text-2xl font-black text-[#0F172A]">A gentle read on today</h2>
        </div>
      </div>

      {!hasEnoughData ? (
        <div className="mt-5 rounded-[1.5rem] bg-[#ECFDF5] p-5 text-base font-semibold leading-7 text-slate-600">
          <p>Keep logging your meals, symptoms and habits.</p>
          <p className="mt-3">As more information becomes available, MUNA will begin identifying patterns.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <CoachSection title="Today's Summary">
            <p>{summary}</p>
          </CoachSection>

          <CoachSection title="Why MUNA thinks this">
            <p>This summary is based on:</p>
            <ul className="mt-3 grid gap-2">
              <li>Sleep: {stats.sleepHours.toFixed(1)} hours</li>
              <li>Water: {stats.waterLiters.toFixed(1)} L</li>
              <li>Stress: {stats.stress}/10</li>
              <li>Bristol Type {stats.bristolType}</li>
            </ul>
          </CoachSection>

          <CoachSection title="Today's Smallest Step">
            <p>{smallestStep}</p>
            <p className="mt-3 text-sm text-slate-500">
              MUNA suggests this because it is small, practical, and connected to today&apos;s logged signals.
            </p>
          </CoachSection>

          <CoachSection title="Encouragement">
            <p>{encouragement}</p>
          </CoachSection>
        </div>
      )}
    </motion.section>
  );
}

function CoachSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.5rem] bg-[#ECFDF5] p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-[#0F766E]">{title}</h3>
      <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">{children}</div>
    </section>
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
      <Link
        href="/health-report"
        className="mt-5 flex w-full items-center justify-between rounded-[1.6rem] bg-gradient-to-r from-[#0F766E] via-[#10B981] to-[#0F766E] px-5 py-4 text-base font-black text-white shadow-[0_20px_50px_rgba(15,118,110,0.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(15,118,110,0.34)]"
      >
        <span className="flex items-center gap-3">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          Generate AI Health Report
        </span>
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </motion.section>
  );
}

function WeeklyProgressSection({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <motion.section variants={variants} className="muna-card rounded-[2rem] p-5 md:p-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Weekly Progress</p>
          <h2 className="mt-2 text-2xl font-black text-[#0F172A]">View Weekly Progress</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Open your gut score, stress, sleep, water, and Bristol trends when you want more detail.
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ECFDF5] text-[#0F766E]">
          <ArrowRight className={`h-5 w-5 transition ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {isOpen ? <WeeklyTrends /> : null}
    </motion.section>
  );
}

function WeeklyTrends() {
  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#0F766E]">Weekly Trends</p>
          <h2 className="text-2xl font-black text-[#0F172A]">Gut score, stress, sleep, water and Bristol</h2>
        </div>
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
    </div>
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
      <h2 className="mt-2 text-3xl font-black text-white">
        You&apos;re not alone. Thousands of people are learning about their gut health together.
      </h2>
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
