type RiskPredictionCardProps = {
  riskScore: number;
  riskLevel: string;
  reasons: string[];
  recommendations: string[];
};

export function RiskPredictionCard({
  riskScore,
  riskLevel,
  reasons,
  recommendations,
}: RiskPredictionCardProps) {
  const tone =
    riskLevel === "Low"
      ? "emerald"
      : riskLevel === "Moderate"
      ? "amber"
      : "red";

  return (
    <div className={`mt-6 rounded-2xl border bg-white p-6 shadow-sm`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className={`text-sm font-semibold uppercase tracking-wide text-${tone}-600`}>
            Tomorrow&apos;s IBS Risk
          </p>

          <h2 className={`mt-2 text-5xl font-bold text-${tone}-700`}>
            {riskScore}%
          </h2>

          <p className="mt-2 text-xl font-bold text-slate-800">
            {riskLevel} Risk
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Based on your latest symptoms, hydration, sleep, bowel movement, and meal logs.
          </p>
        </div>

        <div className={`grid h-32 w-32 place-items-center rounded-full bg-${tone}-100`}>
          <div className="text-center">
            <p className={`text-3xl font-bold text-${tone}-700`}>
              {riskScore}%
            </p>
            <p className={`text-xs font-bold uppercase text-${tone}-700`}>
              {riskLevel}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">Why?</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-900">Today&apos;s Plan</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-800">
            {recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}