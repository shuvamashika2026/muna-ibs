"use client";

import Link from "next/link";
import { ArrowRight, UtensilsCrossed } from "lucide-react";
import type { DashboardFoodInsight } from "@/lib/food-intelligence";

type FoodIntelligenceCardProps = {
  insight: DashboardFoodInsight;
  isLoading?: boolean;
};

export function FoodIntelligenceCard({ insight, isLoading = false }: FoodIntelligenceCardProps) {
  return (
    <section className="muna-card rounded-[2rem] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
          <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#0F766E]">Food Intelligence</p>
          <h2 className="mt-2 text-xl font-black text-[#0F172A]">From your meal and symptom logs</h2>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">Reviewing your recent logs…</p>
      ) : (
        <div className="mt-5 space-y-3 rounded-[1.5rem] bg-[#ECFDF5] p-4">
          <p className="text-sm font-semibold leading-6 text-slate-700">{insight.observation}</p>
          {insight.limitation ? (
            <p className="text-sm font-semibold leading-6 text-slate-600">{insight.limitation}</p>
          ) : null}
          {insight.experiment ? (
            <p className="text-sm font-semibold leading-6 text-slate-600">{insight.experiment}</p>
          ) : null}
        </div>
      )}

      <Link
        href={insight.linkHref}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#0F766E] ring-1 ring-emerald-100 transition hover:bg-[#ECFDF5]"
      >
        {insight.linkLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
