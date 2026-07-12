"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import type { ExperimentProgress } from "@/lib/experiment-progress";
import type { Experiment } from "@/lib/experiment-engine";

type ExperimentModeCardProps = {
  experiment: Experiment | null;
  progress: ExperimentProgress | null;
  isLoading?: boolean;
  error?: string | null;
};

export function ExperimentModeCard({
  experiment,
  progress,
  isLoading = false,
  error = null,
}: ExperimentModeCardProps) {
  return (
    <section className="muna-card rounded-[2rem] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#D1FAE5] text-[#0F766E]">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F766E]">Experiment Mode</p>
          <h2 className="mt-1 text-lg font-black text-[#0F172A] sm:text-xl">Gentle self-observation</h2>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">Checking your experiment status…</p>
      ) : error ? (
        <p className="mt-4 text-sm font-semibold text-slate-600">{error}</p>
      ) : experiment && progress ? (
        <div className="mt-4 rounded-[1.25rem] bg-[#ECFDF5] p-4">
          <p className="text-sm font-black text-[#0F172A]">{experiment.target_label}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {experiment.status} · day {progress.currentDay} of {progress.plannedDays}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {progress.completedCheckIns} check-in(s) logged · {progress.daysRemaining} day(s) remaining
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          Run one small 3–7 day observation. MUNA will summarise your logs without claiming causation.
        </p>
      )}

      <Link
        href="/experiment"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#0F766E] px-4 py-2 text-sm font-black text-white"
      >
        {experiment ? "Open experiment" : "Start experiment"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
