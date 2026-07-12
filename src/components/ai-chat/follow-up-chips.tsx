"use client";

import { Sparkles } from "lucide-react";

type FollowUpChipsProps = {
  suggestions: string[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
};

export function FollowUpChips({ suggestions, onPick, disabled = false }: FollowUpChipsProps) {
  if (!suggestions.length) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">
        <Sparkles className="h-3 w-3 text-[#10B981]" aria-hidden="true" />
        Follow-up ideas
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-left text-xs font-bold text-[#065F46] shadow-sm transition hover:-translate-y-0.5 hover:border-[#10B981]/40 hover:bg-[#ECFDF5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
