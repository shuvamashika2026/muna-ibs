import { confidenceRank } from "@/lib/insights/confidence";
import { createInsight, type InsightConfidence, type InsightType, type MunaInsight } from "@/lib/insights/types";

const DOMAIN_TYPES: InsightType[] = ["food", "hydration", "sleep", "stress", "bowel", "experiment"];

export function generateOverallInsight(input: {
  insights: MunaInsight[];
  unavailableDomains: InsightType[];
  generatedAt: string;
  observationWindowDays: number;
}): MunaInsight | null {
  const domainInsights = input.insights.filter(
    (insight) =>
      insight.type !== "overall" &&
      insight.status !== "insufficient_data" &&
      insight.confidence !== "unavailable"
  );

  const blockedInsights = input.insights.filter((insight) => insight.status === "blocked");
  const ranked = [...blockedInsights, ...domainInsights].sort((a, b) => {
    if (a.status === "blocked" && b.status !== "blocked") return -1;
    if (b.status === "blocked" && a.status !== "blocked") return 1;
    return confidenceRank(b.confidence) - confidenceRank(a.confidence);
  });

  const selected = ranked.slice(0, 5);
  if (!selected.length && input.unavailableDomains.length === 0) {
    return null;
  }

  const summaryParts = selected.map((insight) => insight.summary);
  const missingDomainsText =
    input.unavailableDomains.length > 0
      ? `Missing domains in this window: ${input.unavailableDomains.join(", ")}.`
      : "";

  const nextStep =
    selected.find((insight) => insight.isActionable && insight.suggestedNextStep)?.suggestedNextStep ??
    "Keep logging consistently so MUNA can refine your personal observations.";

  const highestConfidence = selected.reduce<InsightConfidence>(
    (best, insight) =>
      confidenceRank(insight.confidence) > confidenceRank(best) ? insight.confidence : best,
    "limited"
  );

  return createInsight({
    id: "overall-weekly-summary",
    type: "overall",
    title: "Weekly-style insight summary",
    summary: [
      summaryParts.length
        ? `Based on your strongest available observations: ${summaryParts.slice(0, 3).join(" ")}`
        : "There are not yet enough active domain insights for a detailed summary.",
      missingDomainsText,
    ]
      .filter(Boolean)
      .join(" "),
    confidence: selected.length ? highestConfidence : "unavailable",
    evidenceCount: selected.length,
    observationWindowDays: input.observationWindowDays,
    supportingEvidence: selected.map((insight) => `${insight.type}: ${insight.title}`),
    limitations: [
      "This summary combines logged observations only.",
      "It does not diagnose, prescribe or establish causation.",
    ],
    status: selected.length ? "active" : "insufficient_data",
    isActionable: Boolean(nextStep),
    suggestedNextStep: nextStep,
    generatedAt: input.generatedAt,
  });
}

export function detectUnavailableDomains(insightsByType: Record<InsightType, MunaInsight[]>): InsightType[] {
  const unavailable: InsightType[] = [];
  for (const type of DOMAIN_TYPES) {
    const items = insightsByType[type] ?? [];
    if (!items.length || items.every((item) => item.status === "insufficient_data" || item.confidence === "unavailable")) {
      unavailable.push(type);
    }
  }
  return unavailable;
}
