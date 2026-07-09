import { Moon } from "lucide-react";

type SleepSummaryCardProps = {
  sleepHours: string;
  sleepGoal: number;
};

export function SleepSummaryCard({
  sleepHours,
  sleepGoal,
}: SleepSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-950">Sleep</h2>
          <p className="mt-1 text-sm text-slate-500">
            Goal: {sleepGoal} hours
          </p>
        </div>

        <Moon className="h-8 w-8 text-indigo-600" />
      </div>

      <p className="mt-5 text-4xl font-bold text-emerald-950">
        {sleepHours} hrs
      </p>

      <p className="mt-2 text-sm text-slate-500">
        Latest sleep entry from your logs.
      </p>
    </div>
  );
}