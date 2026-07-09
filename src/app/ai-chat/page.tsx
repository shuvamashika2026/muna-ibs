"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestedQuestions = [
  "Why am I bloated today?",
  "Can stress trigger IBS?",
  "What should I eat today?",
  "Explain the brain-gut connection.",
];

export default function AiChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I am MUNA AI. Ask me about IBS tracking, flare routines, food patterns, stress, sleep, hydration, or questions to discuss with your clinician.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    setError("");
    setIsLoading(true);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);

    try {
      const response = await fetch("/api/muna-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await response.json()) as { answer?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "MUNA AI could not respond right now.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer || "I could not generate a response right now.",
        },
      ]);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "MUNA AI could not respond right now.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="Ask MUNA AI" hidePageHeader showDefaultBottomNav={false}>
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl flex-col pb-4">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-100 bg-white text-[#0F766E] shadow-sm"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="flex-1">
            <p className="text-3xl font-black text-[#0F172A]">Ask MUNA AI</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Friendly brain-gut support, not medical diagnosis.
            </p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F766E] text-white shadow-[0_14px_34px_rgba(15,118,110,0.25)]">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
        </header>

        <section className="muna-soft-card mb-4 rounded-[1.5rem] p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0F766E]" aria-hidden="true" />
            <p className="text-sm font-semibold leading-6 text-slate-700">
              MUNA AI does not diagnose, prescribe, or replace a qualified doctor or dietitian. Seek
              urgent medical care for blood in stool, black stool, severe pain, fever, dehydration,
              fainting, or unexplained weight loss.
            </p>
          </div>
        </section>

        <section className="mb-4 grid gap-2 sm:grid-cols-2">
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
        </section>

        <section className="muna-card flex min-h-[24rem] flex-1 flex-col rounded-[1.75rem] p-4">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <motion.div
                key={`${message.role}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[84%] rounded-[1.25rem] bg-[#0F766E] px-4 py-3 text-sm font-semibold leading-6 text-white"
                      : "max-w-[88%] rounded-[1.25rem] bg-[#ECFDF5] px-4 py-3 text-sm font-semibold leading-6 text-[#0F172A]"
                  }
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
            {isLoading ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-[1.25rem] bg-[#ECFDF5] px-4 py-3 text-sm font-bold text-[#065F46]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  MUNA AI is thinking
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about bloating, flares, stress, sleep..."
              className="min-h-14 flex-1 rounded-2xl border border-emerald-100 bg-white px-4 text-base font-semibold text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-4 focus:ring-emerald-100"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#10B981] text-white shadow-[0_14px_34px_rgba(16,185,129,0.28)] transition disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
