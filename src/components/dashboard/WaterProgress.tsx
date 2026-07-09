import { Droplets } from "lucide-react";

type WaterProgressProps = {
  waterToday: number;
  waterGoal: number;
};

export function WaterProgress({ waterToday, waterGoal }: WaterProgressProps) {
  const progress = Math.min(
    100,
    Math.round((waterToday / waterGoal) * 100)
  );

  return (
    <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-emerald-950">Water progress</h2>
          <p className="mt-1 text-sm text-slate-500">
            {waterToday} / {waterGoal} mL
          </p>
        </div>
        <Droplets className="h-8 w-8 text-cyan-600" />
      </div>

      <div className="mt-5 h-4 overflow-hidden rounded-full bg-cyan-100">
        <div
          className="h-full rounded-full bg-cyan-600"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {progress}% of your daily goal completed
      </p>
    </div>
  );
}