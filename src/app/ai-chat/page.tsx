"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Check,
  Mic,
  Send,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AiChatHome } from "@/components/ai-chat/ai-chat-home";
import { AiResponseCards } from "@/components/ai-chat/ai-response-cards";
import { AiThinking } from "@/components/ai-chat/ai-thinking";
import { FollowUpChips } from "@/components/ai-chat/follow-up-chips";
import { buildFollowUpSuggestions, type ConfidenceLevel } from "@/components/ai-chat/parse-ai-response";
import type { MiosSafetyStatus } from "@/lib/mios/types";
import type { ResponseTemplate, StructuredResponseCard, UserSafeEvidenceSummary } from "@/lib/response-engine/types";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  followUps?: string[];
  template?: ResponseTemplate;
  cards?: StructuredResponseCard[];
  safetyStatus?: MiosSafetyStatus;
  confidenceLabel?: ConfidenceLevel | null;
  showConfidenceBadge?: boolean;
  showAssociationFooter?: boolean;
  evidenceSummary?: UserSafeEvidenceSummary;
};

type MunaAiApiResponse = {
  answer?: string;
  error?: string;
  intent?: string;
  template?: ResponseTemplate;
  safetyStatus?: MiosSafetyStatus;
  confidence?: string;
  confidenceLabel?: ConfidenceLevel | null;
  evidenceSummary?: UserSafeEvidenceSummary;
  missingEvidence?: string[];
  suggestedFollowUps?: string[];
  cards?: StructuredResponseCard[];
  showConfidenceBadge?: boolean;
  showAssociationFooter?: boolean;
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

const conversationStarters = [
  {
    label: "Today's bloating",
    prompt: "Why am I bloated today?",
    emoji: "🫧",
  },
  {
    label: "Stress and IBS",
    prompt: "Can stress trigger IBS symptoms for me?",
    emoji: "🧠",
  },
  {
    label: "Gentle food ideas",
    prompt: "What should I eat today based on my logs?",
    emoji: "🥗",
  },
  {
    label: "Brain-gut basics",
    prompt: "Explain the brain-gut connection in simple terms.",
    emoji: "✨",
  },
  {
    label: "Sleep check-in",
    prompt: "How is my recent sleep affecting my gut?",
    emoji: "🌙",
  },
  {
    label: "Symptom patterns",
    prompt: "What patterns do you see in my recent symptoms?",
    emoji: "📊",
  },
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

function getTimeStamp() {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function getDisplayName(metadata: Record<string, unknown> | undefined, email?: string | null) {
  const fullName = typeof metadata?.full_name === "string" ? metadata.full_name : "";
  if (fullName.trim()) return fullName.trim().split(" ")[0];

  if (email) return email.split("@")[0];
  return "";
}

export default function AiChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [displayName, setDisplayName] = useState("");
  const [hasAcceptedMedicalDisclaimer, setHasAcceptedMedicalDisclaimer] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setHasAcceptedMedicalDisclaimer(localStorage.getItem("munaMedicalDisclaimerAccepted") === "true");
  }, []);

  useEffect(() => {
    async function loadUser() {
      if (!supabase) return;

      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      setDisplayName(getDisplayName(data.user.user_metadata, data.user.email));
    }

    loadUser();
  }, []);

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

  function acceptMedicalDisclaimer() {
    localStorage.setItem("munaMedicalDisclaimerAccepted", "true");
    setHasAcceptedMedicalDisclaimer(true);
  }

  const apiHistory = useMemo(
    () =>
      messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages]
  );

  const showHome = messages.length === 0 && !isLoading;

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

      const data = (await response.json()) as MunaAiApiResponse;

      if (!response.ok) {
        throw new Error(data.error || "MUNA AI could not respond right now.");
      }

      const answer = data.answer || "I could not generate a response right now.";
      const followUps = buildFollowUpSuggestions(trimmed, answer, data.suggestedFollowUps);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: answer,
          timestamp: getTimeStamp(),
          followUps,
          template: data.template,
          cards: data.cards,
          safetyStatus: data.safetyStatus,
          confidenceLabel: data.confidenceLabel ?? null,
          showConfidenceBadge: data.showConfidenceBadge ?? false,
          showAssociationFooter: data.showAssociationFooter ?? false,
          evidenceSummary: data.evidenceSummary,
        },
      ]);

      if (speakAnswer) {
        speak(answer);
      }
    } catch (caughtError) {
      const messageText =
        caughtError instanceof Error ? caughtError.message : "MUNA AI could not respond right now.";
      setError(messageText);
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

  if (!hasAcceptedMedicalDisclaimer) {
    return (
      <AppShell title="MUNA AI" hidePageHeader showDefaultBottomNav={false}>
        <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-3xl place-items-center px-2 pb-20">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="muna-card w-full overflow-hidden rounded-[2rem] p-6 md:p-8"
          >
            <Link
              href="/dashboard"
              className="inline-grid h-11 w-11 place-items-center rounded-2xl border border-emerald-100 bg-white text-[#0F766E] shadow-sm"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <span className="inline-grid h-14 w-14 place-items-center rounded-3xl bg-[#0F766E] text-white shadow-[0_18px_36px_rgba(15,118,110,0.22)]">
                  <ShieldCheck className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="mt-5 text-sm font-black uppercase tracking-wide text-[#0F766E]">
                  Medical Disclaimer
                </p>
                <h1 className="mt-2 text-4xl font-black tracking-normal text-[#0F172A]">
                  Before You Use MUNA AI
                </h1>
                <div className="mt-5 space-y-3 text-lg font-semibold leading-8 text-slate-700">
                  <p>MUNA provides educational information and wellness coaching.</p>
                  <p>It does not diagnose, treat or cure medical conditions.</p>
                  <p>
                    Always consult a qualified healthcare professional regarding medical concerns.
                  </p>
                </div>
              </div>
              <div className="hidden rounded-[2rem] bg-[#ECFDF5] p-5 text-[#0F766E] md:block">
                <Bot className="h-20 w-20" aria-hidden="true" />
              </div>
            </div>
            <button
              type="button"
              onClick={acceptMedicalDisclaimer}
              className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0F766E] to-[#10B981] px-6 py-4 text-base font-black text-white shadow-[0_18px_38px_rgba(15,118,110,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,118,110,0.3)]"
            >
              I understand
              <Check className="h-5 w-5" aria-hidden="true" />
            </button>
          </motion.section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="MUNA AI" hidePageHeader showDefaultBottomNav={false}>
      <div className="mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-3xl flex-col px-3 pb-28 pt-2">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-100 bg-white text-[#0F766E] shadow-sm"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <p className="text-base font-black text-[#0F172A]">MUNA AI</p>
              <p className="text-xs font-semibold text-slate-500">Brain-gut companion</p>
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
        </header>

        <section className="muna-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem]">
          <div className="border-b border-emerald-100 px-4 py-3">
            <label className="block text-[11px] font-black uppercase tracking-wide text-[#065F46]">
              Voice language
              <select
                value={voiceLanguage}
                onChange={(event) => setVoiceLanguage(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold text-[#0F172A] outline-none"
              >
                {voiceLanguages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4">
            {showHome ? (
              <AiChatHome
                displayName={displayName}
                starters={conversationStarters}
                onPick={(prompt) => sendMessage(prompt)}
              />
            ) : null}

            {messages.map((message, index) => {
              if (message.role === "user") {
                return <UserBubble key={`user-${index}`} message={message} />;
              }

              const previousUserMessage =
                [...messages.slice(0, index)].reverse().find((item) => item.role === "user")?.content ?? "";

              return (
                <AssistantReply
                  key={`assistant-${index}`}
                  message={message}
                  previousUserMessage={previousUserMessage}
                  onSpeak={speak}
                  onFollowUp={(prompt) => sendMessage(prompt)}
                  disabled={isLoading}
                />
              );
            })}

            {isLoading ? <AiThinking /> : null}
          </div>

          {error ? (
            <p className="mx-4 mb-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <form
            className="border-t border-emerald-100 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-[1.35rem] border border-emerald-100 bg-white p-2 shadow-sm">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about bloating, stress, food, sleep..."
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl bg-transparent px-3 py-2.5 text-sm font-semibold text-[#0F172A] outline-none sm:text-base"
                maxLength={2000}
                rows={1}
              />
              <button
                type="button"
                onClick={() => (isListening ? stopListening() : startListening(false))}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                  isListening ? "bg-red-500 text-white" : "bg-[#ECFDF5] text-[#0F766E]"
                }`}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
              >
                <Mic className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#10B981] text-white shadow-[0_14px_34px_rgba(16,185,129,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </form>

          {!voiceSupported ? (
            <p className="px-4 pb-3 text-center text-[11px] font-semibold text-slate-500">
              Voice features are not supported in this browser. Text chat still works.
            </p>
          ) : (
            <p className="px-4 pb-3 text-center text-[11px] font-semibold text-slate-500">
              Educational only. Personalised from your logged health history.
            </p>
          )}
        </section>
      </div>

      <FloatingVoiceButton isListening={isListening} onClick={() => startListening(true)} />
    </AppShell>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end"
    >
      <div className="max-w-[88%] text-right">
        <div className="rounded-[1.35rem] bg-[#0F766E] px-4 py-3 text-sm font-semibold leading-6 text-white shadow-sm">
          {message.content}
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-400">{message.timestamp}</p>
      </div>
    </motion.div>
  );
}

function AssistantReply({
  message,
  previousUserMessage,
  onSpeak,
  onFollowUp,
  disabled,
}: {
  message: ChatMessage;
  previousUserMessage: string;
  onSpeak: (text: string) => void;
  onFollowUp: (prompt: string) => void;
  disabled: boolean;
}) {
  const followUps =
    message.followUps ?? buildFollowUpSuggestions(previousUserMessage, message.content);

  return (
    <div className="flex justify-start">
      <div className="w-full">
        <AiResponseCards
          content={message.content}
          timestamp={message.timestamp}
          onSpeak={onSpeak}
          template={message.template}
          cards={message.cards}
          safetyStatus={message.safetyStatus}
          confidenceLabel={message.confidenceLabel}
          showConfidenceBadge={message.showConfidenceBadge}
          showAssociationFooter={message.showAssociationFooter}
          suggestedFollowUps={message.followUps}
        />
        <FollowUpChips suggestions={followUps} onPick={onFollowUp} disabled={disabled} />
      </div>
    </div>
  );
}

function FloatingVoiceButton({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#10B981] text-white shadow-[0_20px_50px_rgba(16,185,129,0.38)] sm:h-16 sm:w-16 md:bottom-8"
      aria-label="Start floating voice assistant"
    >
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-[#10B981]"
        animate={isListening ? { scale: [1, 1.45], opacity: [0.7, 0] } : { scale: [1, 1.2], opacity: [0.25, 0] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />
      {isListening ? (
        <span className="relative flex h-7 items-center gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((bar) => (
            <motion.span
              key={bar}
              className="w-1.5 rounded-full bg-white"
              animate={{ height: [8, 22, 10, 18, 8] }}
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
          <Mic className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </motion.span>
      )}
    </button>
  );
}
