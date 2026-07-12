"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";

const THINKING_STAGES = [
  "Reading your question...",
  "Reviewing your health logs...",
  "Looking for personal patterns...",
  "Preparing a gentle response...",
];

export function AiThinking() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % THINKING_STAGES.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-start">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[1.5rem] border border-emerald-100 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ECFDF5] text-[#0F766E]">
            <Brain className="h-5 w-5 animate-pulse" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-[#065F46]">MUNA is thinking</p>
            <motion.p
              key={stageIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold text-slate-500"
            >
              {THINKING_STAGES[stageIndex]}
            </motion.p>
          </div>
        </div>

        <div className="mt-4 flex gap-1.5">
          {THINKING_STAGES.map((stage, index) => (
            <span
              key={stage}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= stageIndex ? "bg-[#10B981]" : "bg-emerald-100"
              }`}
            />
          ))}
        </div>

        <p className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
          <Sparkles className="h-3 w-3 text-[#10B981]" aria-hidden="true" />
          Using only your logged data — never inventing details
        </p>
      </motion.div>
    </div>
  );
}
