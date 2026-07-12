"use client";

import { motion } from "framer-motion";
import {
  Compass,
  Heart,
  Lightbulb,
  Route,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  parseAiResponse,
  type ConfidenceLevel,
  type ParsedAiResponse,
} from "@/components/ai-chat/parse-ai-response";

type AiResponseCardsProps = {
  content: string;
  timestamp: string;
  onSpeak: (text: string) => void;
};

const confidenceStyles: Record<
  ConfidenceLevel,
  { label: string; className: string }
> = {
  Limited: {
    label: "Limited",
    className: "bg-amber-100 text-amber-900",
  },
  Moderate: {
    label: "Moderate",
    className: "bg-sky-100 text-sky-900",
  },
  Higher: {
    label: "Higher",
    className: "bg-emerald-100 text-emerald-900",
  },
};

type ResponseCardProps = {
  title: string;
  body: string | null;
  icon: typeof Lightbulb;
  accent: string;
  delay: number;
};

function ResponseCard({ title, body, icon: Icon, accent, delay }: ResponseCardProps) {
  if (!body) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-[1.25rem] border border-emerald-100 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#0F172A]">{body}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const style = confidenceStyles[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${style.className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Pattern confidence: {style.label}
    </span>
  );
}

export function AiResponseCards({ content, timestamp, onSpeak }: AiResponseCardsProps) {
  const parsed: ParsedAiResponse = parseAiResponse(content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ConfidenceBadge level={parsed.confidence} />
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>{timestamp}</span>
          <button
            type="button"
            onClick={() => onSpeak(content)}
            className="text-[#0F766E]"
            aria-label="Read answer aloud"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {parsed.introduction ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-[1.25rem] bg-gradient-to-r from-[#ECFDF5] to-white px-4 py-3 text-sm font-semibold leading-6 text-[#065F46]"
        >
          {parsed.introduction}
        </motion.p>
      ) : null}

      <ResponseCard
        title="Key Observation"
        body={parsed.keyObservation}
        icon={Lightbulb}
        accent="bg-[#ECFDF5] text-[#0F766E]"
        delay={0.05}
      />
      <ResponseCard
        title="Possible Pattern"
        body={parsed.possiblePattern}
        icon={Compass}
        accent="bg-amber-50 text-amber-700"
        delay={0.1}
      />
      <ResponseCard
        title="One Next Step"
        body={parsed.nextStep}
        icon={Route}
        accent="bg-sky-50 text-sky-700"
        delay={0.15}
      />
      <ResponseCard
        title="Encouragement"
        body={parsed.encouragement}
        icon={Heart}
        accent="bg-rose-50 text-rose-600"
        delay={0.2}
      />

      {!parsed.keyObservation && !parsed.possiblePattern && !parsed.nextStep && !parsed.encouragement ? (
        <div className="rounded-[1.25rem] border border-emerald-100 bg-white p-4 text-sm font-semibold leading-6 text-[#0F172A] shadow-sm">
          {content}
        </div>
      ) : null}

      <p className="flex items-center gap-2 px-1 text-[11px] font-semibold text-slate-400">
        <Sparkles className="h-3 w-3 text-[#10B981]" aria-hidden="true" />
        Patterns are associations from your logs, not confirmed causes.
      </p>
    </motion.div>
  );
}
