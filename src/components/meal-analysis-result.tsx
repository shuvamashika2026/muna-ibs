"use client";

import { AlertTriangle, HelpCircle, RefreshCw, Sparkles } from "lucide-react";
import type { MealAnalysisResult } from "@/lib/meal-analysis/types";

type MealAnalysisResultPanelProps = {
  analysis: MealAnalysisResult;
  cached: boolean;
  isLoading: boolean;
  error: string;
  notice?: string;
  onAnalyzeAgain: () => void;
};

const sourceLabels: Record<MealAnalysisResult["source"], string> = {
  rules: "Local intelligence",
  deepseek: "AI-enhanced",
  hybrid: "Hybrid intelligence",
};

const riskStyles: Record<MealAnalysisResult["riskLevel"], string> = {
  Low: "bg-emerald-100 text-emerald-900",
  Moderate: "bg-amber-100 text-amber-900",
  High: "bg-rose-100 text-rose-900",
};

export function MealAnalysisResultPanel({
  analysis,
  cached,
  isLoading,
  error,
  notice,
  onAnalyzeAgain,
}: MealAnalysisResultPanelProps) {
  const positiveFactors = analysis.protectiveFactors.length
    ? analysis.protectiveFactors
    : analysis.positiveFactors ?? [];

  return (
    <section className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECFDF5] text-[#0F766E]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#065F46]">
              MUNA Digestive Intelligence
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black ${riskStyles[analysis.riskLevel]}`}>
                {analysis.riskLevel} risk
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                Score {analysis.riskScore}/100
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                Confidence {analysis.confidence}
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900">
                {sourceLabels[analysis.source]}
              </span>
              {cached ? (
                <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#0F766E]">
                  Saved analysis
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAnalyzeAgain}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-[#0F766E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          Analyse again
        </button>
      </div>

      {notice ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {analysis.safetyMessage ? (
        <div className="mt-4 flex gap-3 rounded-xl bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{analysis.safetyMessage}</p>
        </div>
      ) : null}

      <p className="mt-4 text-base font-bold leading-7 text-slate-800">{analysis.headline}</p>
      <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{analysis.summary}</p>

      {analysis.explicitIngredients.length ? (
        <IngredientGroup title="Confirmed ingredients" items={analysis.explicitIngredients} />
      ) : null}

      {analysis.inferredIngredients.length ? (
        <IngredientGroup
          title="Inferred ingredients (typical recipe — not confirmed)"
          items={analysis.inferredIngredients}
          muted
        />
      ) : null}

      {analysis.unknownIngredients.length ? (
        <IngredientGroup title="Unclear or unknown items" items={analysis.unknownIngredients} muted />
      ) : null}

      {analysis.fodmapAnalysis.flags.length ? (
        <AnalysisList
          title={`FODMAP analysis (${analysis.fodmapAnalysis.load} load)`}
          items={[
            ...(analysis.fodmapAnalysis.stackingConcern ? [analysis.fodmapAnalysis.stackingConcern] : []),
            ...analysis.fodmapAnalysis.flags.map(
              (item) => `${item.ingredient} (${item.fodmapGroup}): ${item.reason}`
            ),
          ]}
        />
      ) : null}

      {analysis.nonFodmapFactors.length ? (
        <AnalysisList title="Non-FODMAP factors" items={analysis.nonFodmapFactors} />
      ) : null}

      {analysis.portionAnalysis.portionExplanation ? (
        <AnalysisList
          title={`Portion analysis (${analysis.portionAnalysis.portionRisk})`}
          items={[analysis.portionAnalysis.portionExplanation]}
        />
      ) : null}

      {analysis.cookingMethodAnalysis.length ? (
        <AnalysisList title="Cooking method notes" items={analysis.cookingMethodAnalysis} />
      ) : null}

      {analysis.personalAnalysis.toleranceSignals.length ? (
        <AnalysisList
          title="Personal tolerance signals"
          items={analysis.personalAnalysis.toleranceSignals.map(
            (item) => `${item.ingredient} — ${item.state}: ${item.summary}`
          )}
        />
      ) : null}

      {analysis.personalAnalysis.possibleTriggerPatterns.length ? (
        <AnalysisList
          title="Possible personal associations (not causation)"
          items={analysis.personalAnalysis.possibleTriggerPatterns.map(
            (item) =>
              `${item.ingredient} → ${item.symptom} (${item.observationCount} obs, ${item.typicalDelay}, ${item.associationStrength})`
          )}
        />
      ) : null}

      {analysis.personalAnalysis.similarPastMeals.length ? (
        <AnalysisList
          title="Similar past meals"
          items={analysis.personalAnalysis.similarPastMeals.map(
            (item) => `${item.summary} ${item.symptomOutcome}`
          )}
        />
      ) : null}

      <ScoreBreakdownPanel breakdown={analysis.scoreBreakdown} explanation={analysis.scoringExplanation} />

      {positiveFactors.length ? <AnalysisList title="Protective factors" items={positiveFactors} /> : null}

      {analysis.possibleSymptoms.length ? (
        <AnalysisList title="Possible symptoms (may vary)" items={analysis.possibleSymptoms} />
      ) : null}

      {analysis.saferAlternatives.length ? (
        <AnalysisList title="Safer alternatives to consider" items={analysis.saferAlternatives} />
      ) : null}

      {analysis.counterfactualAnalysis.suggestedChanges.length ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Possible adjustments (estimated score{" "}
            {analysis.counterfactualAnalysis.estimatedAdjustedScore ?? "—"})
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.counterfactualAnalysis.suggestedChanges.map((item) => (
              <li key={item.change} className="text-sm font-semibold leading-6 text-slate-700">
                {item.change} — {item.reason} ({item.estimatedImpact} impact)
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.followUpQuestions.length ? (
        <div className="mt-4 flex gap-3 rounded-xl bg-indigo-50 p-4">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-indigo-800">Follow-up questions</p>
            <ul className="mt-2 space-y-1">
              {analysis.followUpQuestions.map((question) => (
                <li key={question} className="text-sm font-semibold leading-6 text-indigo-950">
                  {question}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {(analysis.missingInformation.length || analysis.assumptions.length) ? (
        <AnalysisList
          title="Uncertainty and assumptions"
          items={[...analysis.assumptions, ...analysis.missingInformation]}
        />
      ) : null}

      {analysis.personalPattern ? (
        <div className="mt-4 rounded-xl bg-[#ECFDF5] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#065F46]">Personal pattern summary</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{analysis.personalPattern}</p>
        </div>
      ) : null}

      {analysis.recommendation ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Recommendation</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{analysis.recommendation}</p>
        </div>
      ) : null}

      <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">{analysis.disclaimer}</p>
    </section>
  );
}

function IngredientGroup({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: MealAnalysisResult["explicitIngredients"];
  muted?: boolean;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={`${item.ingredient}-${item.source}`}
            className={`rounded-xl px-3 py-2 text-sm font-semibold leading-6 ${muted ? "bg-amber-50 text-amber-950" : "bg-slate-50 text-slate-700"}`}
          >
            {item.ingredient}{" "}
            <span className="text-xs font-bold opacity-70">
              ({item.source.replace("_", " ")}, {item.confidence} confidence)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreBreakdownPanel({
  breakdown,
  explanation,
}: {
  breakdown: MealAnalysisResult["scoreBreakdown"];
  explanation?: string;
}) {
  const rows = [
    ["Ingredients", breakdown.baseIngredientScore, 25],
    ["FODMAP stacking", breakdown.stackingScore, 15],
    ["Portion", breakdown.portionScore, 15],
    ["Non-FODMAP", breakdown.nonFodmapScore, 15],
    ["Personal patterns", breakdown.personalPatternScore, 20],
    ["Recent context", breakdown.currentContextScore, 10],
  ] as const;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Score breakdown</p>
      <ul className="mt-2 space-y-1">
        {rows.map(([label, value, max]) => (
          <li key={label} className="flex justify-between text-sm font-semibold text-slate-700">
            <span>{label}</span>
            <span>
              {value}/{max}
            </span>
          </li>
        ))}
        {breakdown.protectiveAdjustment ? (
          <li className="flex justify-between text-sm font-semibold text-emerald-700">
            <span>Protective adjustments</span>
            <span>{breakdown.protectiveAdjustment}</span>
          </li>
        ) : null}
        <li className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
          <span>Final score</span>
          <span>{breakdown.finalScore}/100</span>
        </li>
      </ul>
      {explanation ? (
        <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{explanation}</p>
      ) : null}
    </div>
  );
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold leading-6 text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
