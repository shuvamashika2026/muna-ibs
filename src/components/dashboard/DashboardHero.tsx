import { ShieldCheck } from "lucide-react";

type DashboardHeroProps = {
  ibsScore: number;
  scoreLabel: string;
};

export function DashboardHero({ ibsScore, scoreLabel }: DashboardHeroProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 p-6 text-white shadow-lg">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">
            MUNA IBS Score
          </p>
          <h2 className="mt-2 text-5xl font-bold">{ibsScore} / 100</h2>
          <p className="mt-3 text-lg font-medium text-emerald-50">
            {scoreLabel}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50">
            Based on your latest pain, bloating, bowel movement, water, and sleep logs.
          </p>
        </div>

        <div className="rounded-2xl bg-white/15 p-5 text-center backdrop-blur">
          <ShieldCheck className="mx-auto h-12 w-12 text-white" />
          <p className="mt-3 text-sm font-semibold">Today’s status</p>
          <p className="mt-1 text-2xl font-bold">{scoreLabel}</p>
        </div>
      </div>
    </div>
  );
}