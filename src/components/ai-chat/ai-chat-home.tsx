"use client";

import { motion } from "framer-motion";
import { Bot, MessageCircle, Sparkles } from "lucide-react";

type ConversationStarter = {
  label: string;
  prompt: string;
  emoji: string;
};

type AiChatHomeProps = {
  displayName: string;
  starters: ConversationStarter[];
  onPick: (prompt: string) => void;
};

export function AiChatHome({ displayName, starters, onPick }: AiChatHomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-lg flex-col items-center px-2 py-6 text-center"
    >
      <span className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-[#0F766E] to-[#10B981] text-white shadow-[0_18px_40px_rgba(15,118,110,0.28)]">
        <Bot className="h-8 w-8" aria-hidden="true" />
      </span>

      <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-[#10B981]">
        MUNA AI
      </p>
      <h2 className="mt-2 text-2xl font-black text-[#0F172A] sm:text-3xl">
        Hello{displayName ? `, ${displayName}` : ""}
      </h2>
      <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-slate-600">
        I&apos;m here to help you understand your brain-gut patterns using your real logs —
        gently, without diagnosis.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-full bg-[#ECFDF5] px-4 py-2 text-xs font-bold text-[#065F46]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Tap a starter or ask anything below
      </div>

      <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
        {starters.map((starter, index) => (
          <motion.button
            key={starter.label}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onPick(starter.prompt)}
            className="rounded-[1.35rem] border border-emerald-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#10B981]/40 hover:shadow-md"
          >
            <span className="text-lg" aria-hidden="true">
              {starter.emoji}
            </span>
            <p className="mt-2 text-sm font-black text-[#0F172A]">{starter.label}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{starter.prompt}</p>
          </motion.button>
        ))}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
        <Sparkles className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
        Educational support only — not medical diagnosis
      </p>
    </motion.div>
  );
}
