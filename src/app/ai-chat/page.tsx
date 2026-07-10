"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Bot,
  ChartNoAxesCombined,
  Check,
  CircleAlert,
  Leaf,
  Loader2,
  Mic,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Utensils,
  Volume2,
  Waves,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
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

const suggestedQuestions = [
  "Why am I bloated today?",
  "Can stress trigger IBS?",
  "What should I eat today?",
  "Explain the brain-gut connection.",
];

const voiceLanguages = [
  { label: "English", code: "en-US" },
  { label: "Nepali", code: "ne-NP" },
  { label: "Hindi", code: "hi-IN" },
  { label: "Arabic", code: "ar-SA" },
  { label: "Spanish", code: "es-ES" },
  { label: "French", code: "fr-FR" },
  { label: "German", code: "de-DE" },
];

const quickActions = [
  { label: "Analyse my meal", prompt: "Analyse my last meal and explain possible IBS impact.", icon: Utensils },
  { label: "Analyse my stool", prompt: "Help me understand my latest bowel pattern using the Bristol Stool Scale.", icon: Waves },
  { label: "Explain today's symptoms", prompt: "Explain today's symptoms using my food, stress, sleep, water, and bowel logs.", icon: ChartNoAxesCombined },
  { label: "Stress advice", prompt: "Give me calm, practical stress advice for IBS today.", icon: Activity },
  { label: "Improve my sleep", prompt: "Help me sleep better tonight with IBS-friendly tips.", icon: Moon },
  { label: "Meditation", prompt: "Guide me through a short IBS-friendly breathing or meditation exercise.", icon: Sparkles },
  { label: "Build today's meal plan", prompt: "Build a gentle low-FODMAP style meal plan for today.", icon: Leaf },
  { label: "Flare recovery", prompt: "Create a safe flare recovery plan for today.", icon: CircleAlert },
];

const healthMetrics = [
  { label: "Gut Health Score", value: "82 /100", icon: "green", note: "Stable" },
  { label: "Flare Risk Tomorrow", value: "Moderate", icon: "fire", note: "Watch stress" },
  { label: "Sleep", value: "7.4 hours", icon: "sleep", note: "Good" },
  { label: "Stress", value: "Low", icon: "calm", note: "Improving" },
  { label: "Water", value: "1.8 L", icon: "water", note: "600 ml left" },
  { label: "Bowel Pattern", value: "Stable", icon: "bowel", note: "Type 4" },
];

const recommendations = [
  "Drink another 600 ml water",
  "Avoid onion and garlic today",
  "Eat kiwi after lunch",
  "Walk for 10 minutes after dinner",
  "Practice 5-minute breathing exercise",
];

const trendData = [
  { day: "Mon", stress: 6, sleep: 5.8, water: 1.1, pain: 5, bowel: 3, score: 61 },
  { day: "Tue", stress: 5, sleep: 6.4, water: 1.4, pain: 4, bowel: 4, score: 67 },
  { day: "Wed", stress: 4, sleep: 7.1, water: 1.7, pain: 3, bowel: 4, score: 74 },
  { day: "Thu", stress: 4, sleep: 7.4, water: 1.8, pain: 2, bowel: 4, score: 82 },
];

function getTimeStamp() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export default function AiChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello, Shuvam. I am MUNA AI, your personal brain-gut companion. I can help you understand patterns across food, stress, sleep, hydration, symptoms, and bowel habits.",
      timestamp: getTimeStamp(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const hasHealthData = true;

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    const dashboardPrompt = localStorage.getItem("munaDashboardVoicePrompt");
    if (!dashboardPrompt) return;

    localStorage.removeItem("munaDashboardVoicePrompt");
    sendMessage(dashboardPrompt, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apiHistory = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages]
  );

  async function sendMessage(message: string, speakAnswer = false) {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setError("");
    setIsLoading(true);
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmed, timestamp: getTimeStamp() },
    ]);

    try {
      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined;

      const response = await fetch("/api/muna-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          history: apiHistory,
        }),
      });

      const data = (await response.json()) as { answer?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "MUNA AI could not respond right now.");
      }

      const answer = data.answer || "I could not generate a response right now.";
      setMessages((current) => [
        ...current,
        { role: "assistant", content: answer, timestamp: getTimeStamp() },
      ]);

      if (speakAnswer) {
        speak(answer);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "MUNA AI could not respond right now.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function startListening(autoSend = false) {
    const speechWindow = window as WindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceSupported(false);
      setError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    setVoiceSupported(true);
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = voiceLanguage;
    setIsListening(true);
    setError("");

    let finalTranscript = "";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      finalTranscript = transcript.trim();
      setInput(finalTranscript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError("Voice input stopped. Please try again or type your question.");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (autoSend && finalTranscript) {
        handleVoiceCommand(finalTranscript, true);
      }
    };

    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setError("Voice playback is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLanguage;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function handleVoiceCommand(transcript: string, speakAnswer = false) {
    const command = transcript.toLowerCase();

    if (command.includes("log breakfast") || command.includes("log lunch") || command.includes("log dinner")) {
      const mealType = command.includes("lunch") ? "Lunch" : command.includes("dinner") ? "Dinner" : "Breakfast";
      localStorage.setItem("munaVoiceMealDraft", JSON.stringify({ mealType, note: transcript }));
      window.location.href = `/add-meal?voiceDraft=${encodeURIComponent(mealType)}`;
      return;
    }

    if (command.includes("bloating") || command.includes("pain") || command.includes("symptom")) {
      localStorage.setItem("munaVoiceSymptomDraft", JSON.stringify({ symptoms: transcript }));
      window.location.href = `/add-symptoms?voiceDraft=${encodeURIComponent(transcript)}`;
      return;
    }

    if (command.includes("slept") || command.includes("sleep")) {
      localStorage.setItem("munaVoiceSleepDraft", JSON.stringify({ note: transcript }));
      window.location.href = `/sleep?voiceDraft=${encodeURIComponent(transcript)}`;
      return;
    }

    if (command.includes("stress level") || command.includes("stress")) {
      localStorage.setItem("munaVoiceStressDraft", JSON.stringify({ note: transcript }));
      window.location.href = `/add-symptoms?voiceDraft=${encodeURIComponent(transcript)}`;
      return;
    }

    sendMessage(transcript, speakAnswer);
  }

  return (
    <AppShell title="MUNA AI" hidePageHeader showDefaultBottomNav={false}>
      <div className="mx-auto grid max-w-7xl gap-5 pb-24 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-5">
          <header className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/dashboard"
                className="mb-4 inline-grid h-11 w-11 place-items-center rounded-2xl border border-emerald-100 bg-white text-[#0F766E] shadow-sm"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
              <p className="text-lg font-black text-[#0F766E]">
                <span aria-hidden="true">{"\u{1F44B}"}</span> Hello, Shuvam!
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-normal text-[#0F172A] md:text-6xl">
                MUNA AI
              </h1>
              <p className="mt-2 text-xl font-black text-[#10B981]">
                Your Personal Brain-Gut Health Companion
              </p>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                I analyse your symptoms, food, stress, sleep and bowel habits to help you understand
                your IBS and reduce future flare-ups.
              </p>
            </div>
            <div className="hidden h-20 w-20 place-items-center rounded-[1.6rem] bg-[#0F766E] text-white shadow-[0_20px_44px_rgba(15,118,110,0.25)] sm:grid">
              <Bot className="h-10 w-10" aria-hidden="true" />
            </div>
          </header>

          <HealthIntelligenceCard />
          <RecommendationsCard />
          <DailyInsightCard hasHealthData={hasHealthData} />
          <QuickActions onPick={(prompt) => sendMessage(prompt)} />
          <TrendsCard />
        </section>

        <section className="muna-card sticky top-24 flex min-h-[calc(100vh-8rem)] flex-col rounded-[2rem] p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F766E] text-white">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-lg font-black text-[#0F172A]">MUNA AI Chat</p>
                <p className="text-xs font-bold text-slate-500">Powered by your health history</p>
              </div>
            </div>
            <ShieldCheck className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
          </div>

          <div className="mb-4 rounded-2xl bg-[#ECFDF5] p-3">
            <label className="block text-xs font-black uppercase tracking-wide text-[#065F46]">
              Voice language
              <select
                value={voiceLanguage}
                onChange={(event) => setVoiceLanguage(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold text-[#0F172A] outline-none"
              >
                {voiceLanguages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div ref={scrollerRef} className="flex-1 space-y-5 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}`} message={message} onSpeak={speak} />
            ))}
            {isLoading ? <AiLoading /> : null}
          </div>

          {error ? (
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => sendMessage(question)}
                className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-left text-sm font-bold text-[#065F46] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Sparkles className="mb-2 h-4 w-4 text-[#10B981]" aria-hidden="true" />
                {question}
              </button>
            ))}
          </div>

          <form
            className="mt-4 flex items-end gap-2 rounded-[1.5rem] border border-emerald-100 bg-white p-2 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask MUNA about bloating, stress, food, sleep..."
              className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl bg-transparent px-3 py-3 text-base font-semibold text-[#0F172A] outline-none"
              maxLength={2000}
              rows={1}
            />
            <button
              type="button"
              onClick={() => (isListening ? stopListening() : startListening(false))}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                isListening ? "bg-red-500 text-white" : "bg-[#ECFDF5] text-[#0F766E]"
              }`}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              <Mic className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#10B981] text-white shadow-[0_14px_34px_rgba(16,185,129,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>

          {!voiceSupported ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Voice features are not supported in this browser. Text chat still works.
            </p>
          ) : null}

          <footer className="mt-4 text-center text-xs font-semibold leading-5 text-slate-500">
            Powered by OpenAI. Personalised using your unique health history. Medical education only.
          </footer>
        </section>
      </div>

      <FloatingVoiceButton isListening={isListening} onClick={() => startListening(true)} />
    </AppShell>
  );
}

function HealthIntelligenceCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="muna-card rounded-[2rem] p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#0F172A]">Today&apos;s Health Intelligence</h2>
        <span className="rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-black text-[#0F766E]">
          Just now
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {healthMetrics.map((metric) => (
          <div key={metric.label} className="rounded-[1.35rem] bg-[#ECFDF5] p-4">
            <p className="text-xs font-black text-slate-500">{metric.label}</p>
            <p className="mt-2 text-xl font-black text-[#0F172A]">{metric.value}</p>
            <p className="mt-1 text-xs font-bold text-[#10B981]">{metric.note}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function RecommendationsCard() {
  return (
    <section className="muna-soft-card rounded-[2rem] p-5">
      <h2 className="text-xl font-black text-[#0F172A]">Today&apos;s Personal Recommendations</h2>
      <div className="mt-4 grid gap-3">
        {recommendations.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#10B981] text-white">
              <Check className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="font-bold text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyInsightCard({ hasHealthData }: { hasHealthData: boolean }) {
  if (!hasHealthData) {
    return (
      <section className="muna-card rounded-[2rem] p-6 text-center">
        <p className="text-5xl" aria-hidden="true">
          {"\u{1F331}"}
        </p>
        <h2 className="mt-3 text-2xl font-black text-[#0F172A]">Let&apos;s build your health profile.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Log your first meal or symptom and MUNA AI will begin learning your unique Brain-Gut pattern.
        </p>
      </section>
    );
  }

  return (
    <section className="muna-card rounded-[2rem] p-5">
      <h2 className="text-xl font-black text-[#0F172A]">Today&apos;s Insight</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        Your symptoms have been lowest on days when you:
      </p>
      <div className="mt-4 grid gap-2">
        {["Slept more than 7 hours", "Walked after dinner", "Avoided onions"].map((item) => (
          <p key={item} className="font-bold text-[#065F46]">
            <Check className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}

function QuickActions({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-black text-[#0F172A]">Quick AI Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onPick(action.prompt)}
              className="muna-card rounded-[1.5rem] p-4 text-left transition hover:-translate-y-1"
            >
              <Icon className="h-6 w-6 text-[#10B981]" aria-hidden="true" />
              <p className="mt-3 text-sm font-black text-[#0F172A]">{action.label}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TrendsCard() {
  return (
    <section className="muna-card rounded-[2rem] p-5">
      <h2 className="text-xl font-black text-[#0F172A]">Weekly Trends</h2>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gutScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#10B981" strokeWidth={3} fill="url(#gutScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="stress" fill="#0F766E" radius={[10, 10, 0, 0]} />
              <Bar dataKey="pain" fill="#10B981" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ message, onSpeak }: { message: ChatMessage; onSpeak: (text: string) => void }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[88%] ${isUser ? "text-right" : "text-left"}`}>
        <div
          className={
            isUser
              ? "rounded-[1.5rem] bg-[#0F766E] px-4 py-3 text-sm font-semibold leading-6 text-white shadow-sm"
              : "rounded-[1.5rem] border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#0F172A] shadow-sm"
          }
        >
          {message.content}
        </div>
        <div className={`mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400 ${isUser ? "justify-end" : "justify-start"}`}>
          <span>{message.timestamp}</span>
          {!isUser ? (
            <button type="button" onClick={() => onSpeak(message.content)} className="text-[#0F766E]" aria-label="Read answer aloud">
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function AiLoading() {
  return (
    <div className="flex justify-start">
      <div className="rounded-[1.5rem] border border-emerald-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-black text-[#065F46]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Analysing your Brain-Gut relationship...
        </div>
        <div className="mt-3 flex gap-1">
          {[0, 1, 2].map((item) => (
            <motion.span
              key={item}
              className="h-2 w-2 rounded-full bg-[#10B981]"
              animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: item * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingVoiceButton({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-5 z-40 grid h-16 w-16 place-items-center rounded-full bg-[#10B981] text-white shadow-[0_20px_50px_rgba(16,185,129,0.38)] md:bottom-8"
      aria-label="Start floating voice assistant"
    >
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-[#10B981]"
        animate={isListening ? { scale: [1, 1.45], opacity: [0.7, 0] } : { scale: [1, 1.2], opacity: [0.25, 0] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />
      {isListening ? (
        <span className="relative flex h-8 items-center gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((bar) => (
            <motion.span
              key={bar}
              className="w-1.5 rounded-full bg-white"
              animate={{ height: [10, 26, 12, 20, 10] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: bar * 0.08 }}
            />
          ))}
        </span>
      ) : (
        <motion.span
          className="relative"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          <Mic className="h-7 w-7" aria-hidden="true" />
        </motion.span>
      )}
    </button>
  );
}
