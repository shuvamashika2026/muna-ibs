import type { InsightConfidence } from "@/lib/insights/types";

export function foodInsightConfidence(input: {
  exposureCount: number;
  overlapCount: number;
  symptomFreeCount: number;
  mixedResponse: boolean;
}): InsightConfidence {
  if (input.exposureCount < 3) {
    return "unavailable";
  }

  if (input.mixedResponse) {
    return input.exposureCount >= 6 ? "moderate" : "limited";
  }

  if (input.overlapCount >= 2) {
    if (input.exposureCount >= 10 && input.overlapCount >= 3) return "higher";
    if (input.exposureCount >= 6) return "moderate";
    return "limited";
  }

  if (input.symptomFreeCount >= 2 && input.overlapCount === 0) {
    if (input.exposureCount >= 6) return "moderate";
    return "limited";
  }

  return "limited";
}

export function pairedObservationConfidence(input: {
  pairedCount: number;
  consistentCount: number;
  minimumRequired: number;
}): InsightConfidence {
  if (input.pairedCount < input.minimumRequired) {
    return "unavailable";
  }

  const consistencyRatio =
    input.pairedCount > 0 ? input.consistentCount / input.pairedCount : 0;

  if (consistencyRatio >= 0.75 && input.pairedCount >= input.minimumRequired + 3) {
    return input.pairedCount >= 8 ? "higher" : "moderate";
  }

  if (consistencyRatio >= 0.5) {
    return "moderate";
  }

  return "limited";
}

export function trendConfidence(input: {
  observationCount: number;
  minimumRequired: number;
  consistentDirection: boolean;
}): InsightConfidence {
  if (input.observationCount < input.minimumRequired) {
    return "unavailable";
  }
  if (input.consistentDirection && input.observationCount >= 8) {
    return "higher";
  }
  if (input.consistentDirection && input.observationCount >= input.minimumRequired) {
    return "moderate";
  }
  return "limited";
}

export function hydrationTrendConfidence(loggedDays: number, belowGoalDays: number): InsightConfidence {
  if (loggedDays < 3) return "unavailable";
  if (belowGoalDays >= loggedDays) return loggedDays >= 6 ? "moderate" : "limited";
  if (belowGoalDays >= 3) return loggedDays >= 6 ? "moderate" : "limited";
  return "limited";
}

export function mapExperimentConfidence(
  confidence: "Limited" | "Moderate" | "Higher" | null
): InsightConfidence {
  switch (confidence) {
    case "Higher":
      return "higher";
    case "Moderate":
      return "moderate";
    case "Limited":
      return "limited";
    default:
      return "unavailable";
  }
}

export function confidenceRank(confidence: InsightConfidence): number {
  switch (confidence) {
    case "higher":
      return 4;
    case "moderate":
      return 3;
    case "limited":
      return 2;
    default:
      return 1;
  }
}
