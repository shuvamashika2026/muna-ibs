import type { MiosConfidence, MiosEvidenceItem, MiosEvidenceSource } from "@/lib/mios/types";

const CONFIDENCE_RANK: Record<MiosConfidence, number> = {
  unavailable: 0,
  limited: 1,
  moderate: 2,
  higher: 3,
};

export function normalizeMiosConfidence(value: string | null | undefined): MiosConfidence {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "higher" || normalized === "high") {
    return "higher";
  }
  if (normalized === "moderate") {
    return "moderate";
  }
  if (normalized === "limited" || normalized === "low") {
    return "limited";
  }
  return "unavailable";
}

export function mapExperimentConfidence(value: string | null | undefined): MiosConfidence {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "higher") return "higher";
  if (normalized === "moderate") return "moderate";
  if (normalized === "limited") return "limited";
  return "unavailable";
}

export function mapPersonalConfidence(value: string | null | undefined): MiosConfidence {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "higher") return "higher";
  if (normalized === "moderate") return "moderate";
  if (normalized === "low") return "limited";
  return "unavailable";
}

export function aggregateConfidence(items: MiosEvidenceItem[]): MiosConfidence {
  const available = items.filter((item) => item.isAvailable);
  if (!available.length) {
    return "unavailable";
  }

  const ranked = available
    .map((item) => CONFIDENCE_RANK[item.confidence])
    .sort((left, right) => right - left);

  const top = ranked[0] ?? 0;
  if (top >= CONFIDENCE_RANK.higher) return "higher";
  if (top >= CONFIDENCE_RANK.moderate) return "moderate";
  if (top >= CONFIDENCE_RANK.limited) return "limited";
  return "unavailable";
}

export function confidenceForSourceAvailability(
  source: MiosEvidenceSource,
  availableCount: number
): MiosConfidence {
  if (availableCount <= 0) {
    return "unavailable";
  }
  if (source === "personal_history" || source === "experiment") {
    return availableCount >= 2 ? "moderate" : "limited";
  }
  if (source === "verified_guidance") {
    return "moderate";
  }
  if (source === "community") {
    return "limited";
  }
  return "limited";
}

export function compareConfidence(left: MiosConfidence, right: MiosConfidence): number {
  return CONFIDENCE_RANK[left] - CONFIDENCE_RANK[right];
}

export function lowerConfidence(
  left: MiosConfidence,
  right: MiosConfidence
): MiosConfidence {
  return compareConfidence(left, right) <= 0 ? left : right;
}
