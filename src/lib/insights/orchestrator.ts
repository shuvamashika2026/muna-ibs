import { generateBowelInsights } from "@/lib/insights/bowel";
import { generateExperimentInsights } from "@/lib/insights/experiment";
import { generateFoodInsights } from "@/lib/insights/food";
import { generateHydrationInsights } from "@/lib/insights/hydration";
import { detectUnavailableDomains, generateOverallInsight } from "@/lib/insights/overall";
import { generateSleepInsights } from "@/lib/insights/sleep";
import { generateStressInsights } from "@/lib/insights/stress";
import {
  DEFAULT_OBSERVATION_WINDOW_DAYS,
  type InsightConfidence,
  type InsightType,
  type MunaInsight,
  type MunaInsightsInput,
  type MunaInsightsInternalSummary,
  type MunaInsightsOutput,
} from "@/lib/insights/types";

function buildInternalSummary(allInsights: MunaInsight[], unavailableDomains: InsightType[]): MunaInsightsInternalSummary {
  const insightCountsByType: Record<InsightType, number> = {
    food: 0,
    hydration: 0,
    sleep: 0,
    stress: 0,
    bowel: 0,
    experiment: 0,
    overall: 0,
  };
  const confidenceDistribution: Record<InsightConfidence, number> = {
    higher: 0,
    moderate: 0,
    limited: 0,
    unavailable: 0,
  };

  for (const insight of allInsights) {
    insightCountsByType[insight.type] += 1;
    confidenceDistribution[insight.confidence] += 1;
  }

  return {
    insightCountsByType,
    confidenceDistribution,
    unavailableDomains,
    blockedCount: allInsights.filter((insight) => insight.status === "blocked").length,
  };
}

export function generateMunaInsights(input: MunaInsightsInput): MunaInsightsOutput {
  const observationWindowDays = input.observationWindowDays ?? DEFAULT_OBSERVATION_WINDOW_DAYS;

  const food = generateFoodInsights(input);
  const hydration = generateHydrationInsights(input);
  const sleep = generateSleepInsights(input);
  const stress = generateStressInsights(input);
  const bowel = generateBowelInsights(input);
  const experiment = generateExperimentInsights(input);

  const insightsByType: Record<InsightType, MunaInsight[]> = {
    food,
    hydration,
    sleep,
    stress,
    bowel,
    experiment,
    overall: [],
  };

  const unavailableDomains = detectUnavailableDomains(insightsByType);
  const domainInsights = [...food, ...hydration, ...sleep, ...stress, ...bowel, ...experiment];
  const overallInsight = generateOverallInsight({
    insights: domainInsights,
    unavailableDomains,
    generatedAt: input.generatedAt,
    observationWindowDays,
  });

  const allInsights = overallInsight ? [...domainInsights, overallInsight] : domainInsights;
  const activeInsights = allInsights.filter((insight) => insight.status === "active");
  const actionableInsights = allInsights.filter((insight) => insight.isActionable && insight.status !== "blocked");

  return {
    allInsights,
    activeInsights,
    actionableInsights,
    overallInsight,
    unavailableDomains,
    internalSummary: buildInternalSummary(allInsights, unavailableDomains),
  };
}
