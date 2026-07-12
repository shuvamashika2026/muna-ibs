"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { DailyBrief } from "@/lib/daily-brief";

type DailyBriefCardProps = {
  brief: DailyBrief | null;
  isLoading?: boolean;
  error?: string | null;
};

export function DailyBriefCard({ brief, isLoading = false, error = null }: DailyBriefCardProps) {
  return (
    <section className="muna-card rounded-[2rem] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F766E]">Daily AI Brief</p>
          {brief ? (
            <>
              <h2 className="mt-1 text-lg font-black leading-6 text-[#0F172A] sm:text-xl">{brief.greeting}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{brief.dateLabel}</p>
            </>
          ) : (
            <h2 className="mt-1 text-lg font-black text-[#0F172A] sm:text-xl">Your daily brief</h2>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">Preparing your brief from logged data…</p>
      ) : error ? (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{error}</p>
      ) : brief ? (
        <div className="mt-4 space-y-3 rounded-[1.25rem] bg-[#ECFDF5] p-4">
          <p className="text-sm font-semibold leading-6 text-slate-700">{brief.observation}</p>
          {brief.limitation ? (
            <p className="text-sm font-semibold leading-6 text-slate-600">{brief.limitation}</p>
          ) : null}
          {brief.nextAction ? (
            <p className="text-sm font-semibold leading-6 text-[#0F766E]">{brief.nextAction}</p>
          ) : null}
        </div>
      ) : null}

      {!isLoading && brief?.isEmpty ? (
        <Link
          href="/add-meal"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#0F766E] px-4 py-2 text-sm font-black text-white"
        >
          Start logging
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
