"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Compass,
  Heart,
  Lightbulb,
  Route,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Volume2,
} from "lucide-react";
import {
  cardsToSpeakableText,
  inferConfidence,
  parseAiResponse,
  parseMdreResponse,
  type ConfidenceLevel,
  type ParsedMdreResponse,
} from "@/components/ai-chat/parse-ai-response";
import type { MiosSafetyStatus } from "@/lib/mios/types";
import { getCardIconKey } from "@/lib/response-engine/templates";
import type { ResponseTemplate, StructuredResponseCard } from "@/lib/response-engine/types";

type AiResponseCardsProps = {
  content: string;
  timestamp: string;
  onSpeak: (text: string) => void;
  template?: ResponseTemplate;
  cards?: StructuredResponseCard[];
  safetyStatus?: MiosSafetyStatus;
  confidenceLabel?: ConfidenceLevel | null;
  showConfidenceBadge?: boolean;
  showAssociationFooter?: boolean;
  suggestedFollowUps?: string[];
};

const confidenceStyles: Record<ConfidenceLevel, { label: string; className: string }> = {
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
  emergency?: boolean;
  crisis?: boolean;
};

function ResponseCard({ title, body, icon: Icon, accent, delay, emergency = false, crisis = false }: ResponseCardProps) {
  if (!body) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={
        crisis
          ? "rounded-[1.25rem] border-2 border-violet-400 bg-violet-50 p-4 shadow-sm"
          : emergency
          ? "rounded-[1.25rem] border-2 border-red-300 bg-red-50 p-4 shadow-sm"
          : "rounded-[1.25rem] border border-emerald-100 bg-white p-4 shadow-sm"
      }
      role={crisis || emergency ? "alert" : undefined}
      aria-live={crisis || emergency ? "assertive" : undefined}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p
            className={`text-xs font-black uppercase tracking-wide ${
              crisis ? "text-violet-900" : emergency ? "text-red-800" : "text-slate-500"
            }`}
          >
            {title}
          </p>
          <p
            className={`mt-2 text-sm font-semibold leading-6 ${
              crisis ? "text-violet-950" : emergency ? "text-red-950" : "text-[#0F172A]"
            }`}
          >
            {body}
          </p>
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
      <span>Pattern confidence: {style.label}</span>
    </span>
  );
}

function iconForCard(template: ResponseTemplate, cardKey: string) {
  const iconKey = getCardIconKey(template, cardKey);
  switch (iconKey) {
    case "alert":
      return AlertTriangle;
    case "action":
      return Stethoscope;
    case "shield":
      return ShieldAlert;
    case "confidence":
      return ShieldCheck;
    case "compass":
      return Compass;
    case "route":
      return Route;
    case "heart":
      return Heart;
    default:
      return Lightbulb;
  }
}

function accentForCard(template: ResponseTemplate, cardKey: string, emergency: boolean, crisis = false): string {
  if (crisis) {
    if (cardKey === "reach_out_now" || cardKey === "immediate_safety") {
      return "bg-violet-700 text-white";
    }
    return "bg-violet-100 text-violet-900";
  }
  if (emergency) {
    if (cardKey === "safety_alert" || cardKey === "what_to_do_now") {
      return "bg-red-600 text-white";
    }
    return "bg-red-100 text-red-800";
  }
  if (cardKey.includes("confidence")) return "bg-sky-50 text-sky-700";
  if (cardKey.includes("evidence") || cardKey.includes("pattern") || cardKey.includes("contributor")) {
    return "bg-amber-50 text-amber-700";
  }
  if (cardKey.includes("next") || cardKey.includes("step")) return "bg-sky-50 text-sky-700";
  if (cardKey.includes("support") || cardKey.includes("encouragement") || cardKey.includes("hear")) {
    return "bg-rose-50 text-rose-600";
  }
  if (template === "education") return "bg-[#ECFDF5] text-[#0F766E]";
  return "bg-[#ECFDF5] text-[#0F766E]";
}

function TemplateCardsView({
  parsed,
  timestamp,
  onSpeak,
}: {
  parsed: ParsedMdreResponse;
  timestamp: string;
  onSpeak: (text: string) => void;
}) {
  const isCrisis = parsed.template === "crisis";
  const isEmergency = parsed.template === "emergency";
  const speakText = cardsToSpeakableText(parsed.cards);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl space-y-3"
    >
      {isCrisis ? (
        <div
          className="rounded-[1.35rem] border-2 border-violet-500 bg-gradient-to-r from-violet-100 to-violet-50 px-4 py-3"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 text-violet-950">
            <Heart className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-black uppercase tracking-wide">Crisis support response</p>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-violet-950">
            You deserve immediate support from a real person. Please contact local emergency services or a crisis
            helpline in your area, and reach someone you trust nearby if you can.
          </p>
        </div>
      ) : null}

      {isEmergency ? (
        <div
          className="rounded-[1.35rem] border-2 border-red-400 bg-gradient-to-r from-red-100 to-red-50 px-4 py-3"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 text-red-900">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-black uppercase tracking-wide">Urgent safety response</p>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-red-950">
            MUNA cannot determine the cause through chat. Please seek medical assessment promptly.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {parsed.showConfidenceBadge && parsed.confidence ? (
          <ConfidenceBadge level={parsed.confidence} />
        ) : (
          <span className="text-xs font-semibold text-slate-400">MUNA response</span>
        )}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span>{timestamp}</span>
          <button
            type="button"
            onClick={() => onSpeak(speakText || parsed.rawContent)}
            className="text-[#0F766E]"
            aria-label="Read answer aloud"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {parsed.cards.map((card, index) => (
        <ResponseCard
          key={card.key}
          title={card.title}
          body={card.content}
          icon={iconForCard(parsed.template, card.key)}
          accent={accentForCard(parsed.template, card.key, isEmergency, isCrisis)}
          delay={0.05 * (index + 1)}
          emergency={isEmergency}
          crisis={isCrisis}
        />
      ))}

      {parsed.showAssociationFooter ? (
        <p className="flex items-center gap-2 px-1 text-[11px] font-semibold text-slate-400">
          <Sparkles className="h-3 w-3 text-[#10B981]" aria-hidden="true" />
          Patterns are associations from your logs, not confirmed causes.
        </p>
      ) : null}
    </motion.div>
  );
}

function LegacyCardsView({
  content,
  timestamp,
  onSpeak,
}: {
  content: string;
  timestamp: string;
  onSpeak: (text: string) => void;
}) {
  const parsed = parseAiResponse(content);

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

export function AiResponseCards({
  content,
  timestamp,
  onSpeak,
  template,
  cards,
  safetyStatus = "none",
  confidenceLabel = null,
  showConfidenceBadge = false,
  showAssociationFooter = false,
  suggestedFollowUps,
}: AiResponseCardsProps) {
  if (template && cards?.length) {
    const parsed: ParsedMdreResponse = {
      template,
      cards,
      followUps: suggestedFollowUps ?? [],
      confidence: showConfidenceBadge ? confidenceLabel ?? inferConfidence(content) : null,
      safetyStatus,
      showConfidenceBadge,
      showAssociationFooter,
      isStructured: true,
      rawContent: content,
    };
    return <TemplateCardsView parsed={parsed} timestamp={timestamp} onSpeak={onSpeak} />;
  }

  if (template) {
    const parsed = parseMdreResponse({
      rawContent: content,
      template,
      safetyStatus,
      showConfidenceBadge,
      showAssociationFooter,
      confidenceLabel,
      followUps: suggestedFollowUps,
    });
    return <TemplateCardsView parsed={parsed} timestamp={timestamp} onSpeak={onSpeak} />;
  }

  return <LegacyCardsView content={content} timestamp={timestamp} onSpeak={onSpeak} />;
}
