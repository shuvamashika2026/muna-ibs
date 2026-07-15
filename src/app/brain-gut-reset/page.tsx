"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Leaf, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MunaSoundSpace } from "@/components/muna-sound-space";

type StepId = "welcome" | "breath" | "nose" | "body" | "reflection";
type Feeling = "Calmer" | "About the Same" | "Still Tense";

type ResetStep = {
  id: StepId;
  label: string;
  title: string;
  duration: number;
};

const steps: ResetStep[] = [
  { id: "welcome", label: "Welcome", title: "Brain-Gut Reset", duration: 0 },
  { id: "breath", label: "Breath", title: "Observe Your Breath", duration: 60 },
  { id: "nose", label: "Nose", title: "Notice the Tip of Your Nose", duration: 60 },
  { id: "body", label: "Body", title: "Observe Your Body", duration: 120 },
  { id: "reflection", label: "Reflect", title: "How do you feel now?", duration: 0 },
];

const feelingOptions = [
  { label: "Calmer", icon: "😊" },
  { label: "About the Same", icon: "😐" },
  { label: "Still Tense", icon: "😔" },
] as const;

function StepTimerState({
  duration,
  children,
}: {
  duration: number;
  children: (state: { timerLabel: string; timerComplete: boolean }) => ReactNode;
}) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [timerComplete, setTimerComplete] = useState(duration === 0);
  const isTimedStep = duration > 0;

  useEffect(() => {
    if (!isTimedStep || timerComplete) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setTimerComplete(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTimedStep, timerComplete, duration]);

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  return <>{children({ timerLabel, timerComplete })}</>;
}

export default function BrainGutResetPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [notes, setNotes] = useState("");
  const [savedResponse, setSavedResponse] = useState<{ feeling: Feeling; notes: string } | null>(null);

  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  function goNext() {
    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function saveReflection() {
    if (!feeling) return;
    setSavedResponse({ feeling, notes });
  }

  return (
    <StepTimerState key={step.id} duration={step.duration}>
      {({ timerLabel, timerComplete }) => (
    <AppShell title="Brain-Gut Reset" hidePageHeader showDefaultBottomNav={false}>
      <main className="relative -mx-4 -my-6 min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-b from-white via-[#ECFDF5] to-white px-4 py-5 md:-my-10 md:px-6">
        <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#D1FAE5] blur-3xl" />

        <section className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#0F766E]">MUNA Reset</p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Step {stepIndex + 1} of {steps.length} · {step.label}
              </p>
            </div>
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-black text-[#0F766E] shadow-sm ring-1 ring-emerald-100">
              {progress}%
            </div>
          </header>

          <div className="mt-5 h-3 rounded-full bg-white shadow-inner ring-1 ring-emerald-100">
            <motion.div
              className="h-3 rounded-full bg-gradient-to-r from-[#0F766E] to-[#10B981]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          </div>

          <div className="grid flex-1 place-items-center py-8">
            <div className="w-full">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full"
              >
                {step.id === "welcome" ? <WelcomeStep onBegin={goNext} /> : null}
                {step.id === "breath" ? <BreathStep timerLabel={timerLabel} timerComplete={timerComplete} onNext={goNext} /> : null}
                {step.id === "nose" ? <NoseStep timerLabel={timerLabel} timerComplete={timerComplete} onNext={goNext} /> : null}
                {step.id === "body" ? <BodyStep timerLabel={timerLabel} timerComplete={timerComplete} onNext={goNext} /> : null}
                {step.id === "reflection" ? (
                  <ReflectionStep
                    feeling={feeling}
                    setFeeling={setFeeling}
                    notes={notes}
                    setNotes={setNotes}
                    savedResponse={savedResponse}
                    onSave={saveReflection}
                  />
                ) : null}
              </motion.div>
              <MunaSoundSpace />
            </div>
          </div>

          <footer className="flex items-center justify-between gap-3 pb-2">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#0F766E] shadow-sm ring-1 ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              Back
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              {steps.map((item, index) => (
                <span
                  key={item.id}
                  className={`h-2.5 w-2.5 rounded-full ${index <= stepIndex ? "bg-[#0F766E]" : "bg-emerald-100"}`}
                />
              ))}
            </div>
            {step.id !== "welcome" && step.id !== "reflection" ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!timerComplete}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(15,118,110,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <div className="min-h-12 min-w-24" />
            )}
          </footer>
        </section>
      </main>
    </AppShell>
      )}
    </StepTimerState>
  );
}

function WelcomeStep({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <AnimatedOrb />
      <h1 className="mt-8 text-5xl font-black tracking-normal text-[#0F172A] md:text-7xl">Brain-Gut Reset</h1>
      <div className="mx-auto mt-6 max-w-2xl space-y-5 text-xl font-semibold leading-9 text-slate-600">
        <p>Welcome.</p>
        <p>For the next few minutes, you don&apos;t need to solve anything.</p>
        <p>Simply observe your experience with curiosity.</p>
      </div>
      <button
        type="button"
        onClick={onBegin}
        className="mt-9 inline-flex min-h-16 items-center justify-center rounded-[1.5rem] bg-[#0F766E] px-8 py-4 text-lg font-black text-white shadow-[0_20px_50px_rgba(15,118,110,0.28)]"
      >
        Begin Reset
      </button>
    </div>
  );
}

function BreathStep({ timerLabel, timerComplete, onNext }: { timerLabel: string; timerComplete: boolean; onNext: () => void }) {
  return (
    <GuidedStepShell title="Observe Your Breath" timerLabel={timerLabel} timerComplete={timerComplete} onNext={onNext}>
      <BreathingAnimation />
      <InstructionText
        lines={[
          "Do not change your breathing.",
          "Simply notice the air entering and leaving through your nose.",
          "If your mind wanders, gently bring your attention back.",
        ]}
      />
    </GuidedStepShell>
  );
}

function NoseStep({ timerLabel, timerComplete, onNext }: { timerLabel: string; timerComplete: boolean; onNext: () => void }) {
  return (
    <GuidedStepShell title="Notice the Tip of Your Nose" timerLabel={timerLabel} timerComplete={timerComplete} onNext={onNext}>
      <NoseAnimation />
      <InstructionText
        lines={[
          "Bring your attention to the tip of your nose.",
          "Notice any sensations.",
          "Warmth. Coolness. Tingling. Movement.",
          "No need to judge anything.",
          "Simply observe.",
        ]}
      />
    </GuidedStepShell>
  );
}

function BodyStep({ timerLabel, timerComplete, onNext }: { timerLabel: string; timerComplete: boolean; onNext: () => void }) {
  return (
    <GuidedStepShell title="Observe Your Body" timerLabel={timerLabel} timerComplete={timerComplete} onNext={onNext}>
      <BodyOutline />
      <InstructionText
        lines={[
          "Slowly move your attention throughout your body.",
          "Observe whatever sensations are present.",
          "Pleasant. Unpleasant. Neutral.",
          "Everything changes.",
          "Simply notice and continue.",
        ]}
      />
    </GuidedStepShell>
  );
}

function GuidedStepShell({
  title,
  timerLabel,
  timerComplete,
  onNext,
  children,
}: {
  title: string;
  timerLabel: string;
  timerComplete: boolean;
  onNext: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
      <div className="rounded-[2rem] bg-white/80 p-5 text-center shadow-[0_18px_60px_rgba(15,118,110,0.10)] ring-1 ring-emerald-100">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0F766E]">Countdown</p>
        <p className="mt-3 text-6xl font-black tabular-nums text-[#0F172A]">{timerLabel}</p>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {timerComplete ? "Timer complete. You can continue." : "Next appears when the timer finishes."}
        </p>
        {timerComplete ? (
          <button
            type="button"
            onClick={onNext}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#0F766E] px-6 py-3 text-sm font-black text-white"
          >
            Next
          </button>
        ) : null}
      </div>
      <div className="rounded-[2.25rem] bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,118,110,0.12)] ring-1 ring-emerald-100 md:p-8">
        <h1 className="text-4xl font-black tracking-normal text-[#0F172A] md:text-5xl">{title}</h1>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

function InstructionText({ lines }: { lines: string[] }) {
  return (
    <div className="mt-7 space-y-4 text-lg font-semibold leading-8 text-slate-600">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function ReflectionStep({
  feeling,
  setFeeling,
  notes,
  setNotes,
  savedResponse,
  onSave,
}: {
  feeling: Feeling | null;
  setFeeling: (feeling: Feeling) => void;
  notes: string;
  setNotes: (notes: string) => void;
  savedResponse: { feeling: Feeling; notes: string } | null;
  onSave: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-[2.25rem] bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,118,110,0.12)] ring-1 ring-emerald-100 md:p-8">
      <div className="text-center">
        <Sparkles className="mx-auto h-10 w-10 text-[#0F766E]" aria-hidden="true" />
        <h1 className="mt-4 text-4xl font-black tracking-normal text-[#0F172A] md:text-5xl">How do you feel now?</h1>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {feelingOptions.map((option) => {
          const isSelected = feeling === option.label;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => setFeeling(option.label)}
              className={`min-h-20 rounded-2xl px-4 py-3 text-left text-base font-black transition ${
                isSelected ? "bg-[#0F766E] text-white shadow-[0_16px_40px_rgba(15,118,110,0.24)]" : "bg-[#ECFDF5] text-[#0F172A]"
              }`}
            >
              <span className="mr-2 text-xl" aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          );
        })}
      </div>

      <label className="mt-7 grid gap-3 text-sm font-black uppercase tracking-wide text-slate-500">
        Optional Notes
        <textarea
          className="min-h-36 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-base font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-[#0F766E] focus:ring-4 focus:ring-emerald-100"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything you noticed today?"
        />
      </label>

      <button
        type="button"
        onClick={onSave}
        disabled={!feeling}
        className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F766E] px-5 py-3 font-black text-white shadow-[0_16px_40px_rgba(15,118,110,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Check className="h-5 w-5" aria-hidden="true" />
        Save response
      </button>

      {savedResponse ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-7 rounded-[1.75rem] bg-[#ECFDF5] p-6 text-center"
        >
          <p className="text-3xl font-black text-[#0F172A]">Well done.</p>
          <p className="mx-auto mt-4 max-w-xl text-lg font-semibold leading-8 text-slate-600">
            Every moment of awareness helps you better understand yourself.
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

function AnimatedOrb() {
  return (
    <motion.div
      className="mx-auto grid h-40 w-40 place-items-center rounded-full bg-gradient-to-br from-[#D1FAE5] to-white shadow-[0_24px_80px_rgba(15,118,110,0.18)] ring-1 ring-emerald-100"
      animate={{ scale: [1, 1.06, 1], opacity: [0.92, 1, 0.92] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      <Leaf className="h-14 w-14 text-[#0F766E]" aria-hidden="true" />
    </motion.div>
  );
}

function BreathingAnimation() {
  return (
    <div className="grid place-items-center">
      <motion.div
        className="grid h-52 w-52 place-items-center rounded-full bg-[#ECFDF5] ring-1 ring-emerald-100"
        animate={{ scale: [0.92, 1.08, 0.92] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="h-32 w-32 rounded-full bg-gradient-to-br from-[#0F766E] to-[#10B981] opacity-90 shadow-[0_20px_60px_rgba(15,118,110,0.25)]"
          animate={{ scale: [0.86, 1, 0.86], opacity: [0.72, 0.94, 0.72] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

function NoseAnimation() {
  return (
    <div className="grid place-items-center py-4">
      <div className="relative h-52 w-52 rounded-[3rem] bg-[#ECFDF5] ring-1 ring-emerald-100">
        <div className="absolute left-1/2 top-10 h-32 w-16 -translate-x-1/2 rounded-full border-4 border-[#0F766E]/30" />
        <motion.div
          className="absolute left-1/2 top-[7.25rem] h-8 w-8 -translate-x-1/2 rounded-full bg-[#0F766E]"
          animate={{ scale: [1, 1.35, 1], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-[7.25rem] h-14 w-14 -translate-x-1/2 rounded-full border border-[#10B981]"
          animate={{ scale: [0.7, 1.45], opacity: [0.6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function BodyOutline() {
  return (
    <div className="grid place-items-center py-2">
      <svg className="h-72 w-52 text-[#0F766E]" viewBox="0 0 160 240" role="img" aria-label="Body outline with gentle moving awareness highlight">
        <circle cx="80" cy="32" r="22" fill="#ECFDF5" stroke="currentColor" strokeWidth="5" />
        <path
          d="M52 72 C58 58 102 58 108 72 L124 134 C128 150 112 157 105 142 L96 110 L96 218 C96 230 82 230 80 218 C78 230 64 230 64 218 L64 110 L55 142 C48 157 32 150 36 134 Z"
          fill="#ECFDF5"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <motion.circle
          cx="80"
          r="14"
          fill="#10B981"
          opacity="0.65"
          animate={{ cy: [32, 78, 122, 172, 212, 122, 32] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
}
