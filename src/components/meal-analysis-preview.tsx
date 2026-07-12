"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import {
  formatFodmapCategoryLabel,
  formatFodmapLevelLabel,
  getMealOverallLabel,
  summarizeMeal,
  type FodmapLevel,
} from "@/lib/food-intelligence";

const DISCLAIMER =
  "FODMAP content can depend on portion size, preparation and individual tolerance. This information is educational and not a diagnosis.";

type MealAnalysisPreviewProps = {
  mealText: string;
};

const levelStyles: Record<FodmapLevel, string> = {
  low: "bg-emerald-100 text-emerald-900",
  moderate: "bg-amber-100 text-amber-900",
  high: "bg-rose-100 text-rose-900",
  unknown: "bg-slate-100 text-slate-700",
};

export function MealAnalysisPreview({ mealText }: MealAnalysisPreviewProps) {
  const analysis = useMemo(() => {
    const trimmed = mealText.trim();
    if (!trimmed) return null;

    const summary = summarizeMeal(trimmed);
    return {
      summary,
      overallLabel: getMealOverallLabel(summary),
    };
  }, [mealText]);

  if (!analysis) return null;

  const { summary, overallLabel } = analysis;

  return (
    <section className="mt-5 rounded-2xl border border-emerald-100 bg-[#ECFDF5] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#0F766E]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-[#065F46]">
            Meal analysis preview
          </p>
          <p className="mt-1 text-sm font-black text-[#0F172A]">{overallLabel}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{DISCLAIMER}</p>
        </div>
      </div>

      {summary.items.length ? (
        <div className="mt-4 space-y-3">
          {summary.items.map((item) => {
            const displayName = item.matched ? item.canonicalName ?? item.input : item.input;
            const category = formatFodmapCategoryLabel(item.fodmapCategory);

            return (
              <article
                key={`${item.input}-${item.normalizedInput}`}
                className="rounded-xl border border-emerald-100 bg-white p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-black text-[#0F172A]">{displayName}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${levelStyles[item.fodmapLevel]}`}
                  >
                    {formatFodmapLevelLabel(item.fodmapLevel)}
                  </span>
                </div>

                {category ? (
                  <p className="mt-2 text-xs font-bold text-[#0F766E]">Category: {category}</p>
                ) : null}

                {item.note ? (
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{item.note}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-600">
          Enter foods above to see an educational FODMAP preview before saving.
        </p>
      )}
    </section>
  );
}
