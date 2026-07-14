import type { PersonalMemoryProfile, MemoryEntry } from "@/lib/mios/adapters/types-bridge";
import { mapPersonalConfidence } from "@/lib/mios/confidence";
import type { MiosEvidenceItem, MiosRelevance } from "@/lib/mios/types";
import { MIOS_SOURCE_LABELS } from "@/lib/mios/types";

export type PersonalHealthSummary = {
  authenticated: boolean;
  confidenceLabel: string;
  relevantLoggedDays: number;
  totalRecords: number;
  hasInsufficientData: boolean;
  latestPain: number | null;
  latestBloating: number | null;
  latestStress: number | null;
  latestSleepHours: number | null;
  latestBristol: number | null;
  latestWaterLiters: number | null;
  observedPositiveHabits: string[];
  possibleAssociations: string[];
  knownTriggers: string[];
};

function collectMemoryEntries(profile: PersonalMemoryProfile): MemoryEntry[] {
  return [
    ...profile.generalFodmapFoods,
    ...profile.likelyTriggerFoods,
    ...profile.userMarkedTriggerFoods,
    ...profile.toleratedFoods,
    profile.averageSleep,
    profile.hydrationHabits,
    profile.stressTrends,
    profile.bowelTrends,
    profile.ibsSubtype,
    ...profile.userPreferences,
  ];
}

function relevanceForEntry(entry: MemoryEntry): MiosRelevance {
  if (entry.kind === "association" || entry.kind === "user_marked") {
    return "high";
  }
  if (entry.kind === "observation") {
    return "moderate";
  }
  return "low";
}

function confidenceForEntry(entry: MemoryEntry, summary: PersonalHealthSummary): ReturnType<typeof mapPersonalConfidence> {
  if (entry.kind === "association") {
    return mapPersonalConfidence(summary.confidenceLabel);
  }
  if (entry.kind === "user_marked") {
    return "moderate";
  }
  if (entry.label.toLowerCase().includes("tolerated") || entry.value.toLowerCase().includes("without elevated symptoms")) {
    return mapPersonalConfidence(summary.confidenceLabel);
  }
  return "limited";
}

function extractTopics(text: string): string[] {
  const foods = ["garlic", "onion", "dairy", "gluten", "lettuce", "wheat", "milk", "coffee"];
  const normalized = text.toLowerCase();
  return foods.filter((food) => normalized.includes(food));
}

export function mapPersonalMemoryToEvidence(
  profile: PersonalMemoryProfile,
  summary: PersonalHealthSummary
): MiosEvidenceItem[] {
  const items: MiosEvidenceItem[] = [];

  for (const [index, entry] of collectMemoryEntries(profile).entries()) {
    if (entry.kind === "unavailable") {
      continue;
    }

    items.push({
      id: `personal-memory-${index}`,
      source: "personal_history",
      title: entry.label,
      summary: entry.value,
      confidence: confidenceForEntry(entry, summary),
      relevance: relevanceForEntry(entry),
      limitations: [
        entry.kind === "association"
          ? "Association in logs only; not proof of causation."
          : "Self-reported or logged observation only.",
      ],
      sourceLabel: MIOS_SOURCE_LABELS.personal_history,
      isAvailable: true,
      topics: extractTopics(`${entry.label} ${entry.value}`),
    });
  }

  if (summary.latestBloating !== null) {
    items.push({
      id: "personal-latest-bloating",
      source: "personal_history",
      title: "Latest logged bloating",
      summary: `Latest bloating severity logged as ${summary.latestBloating}.`,
      confidence: mapPersonalConfidence(summary.confidenceLabel),
      relevance: "high",
      limitations: ["Single latest value only."],
      sourceLabel: MIOS_SOURCE_LABELS.personal_history,
      isAvailable: true,
      topics: ["bloating"],
    });
  }

  if (summary.knownTriggers.length) {
    items.push({
      id: "personal-known-triggers",
      source: "personal_history",
      title: "User-marked trigger foods",
      summary: `User-marked triggers in logs: ${summary.knownTriggers.join(", ")}.`,
      confidence: "moderate",
      relevance: "moderate",
      limitations: ["User-marked, not confirmed by MUNA analysis."],
      sourceLabel: MIOS_SOURCE_LABELS.personal_history,
      isAvailable: true,
      topics: summary.knownTriggers.map((item) => item.toLowerCase()),
    });
  }

  for (const [index, habit] of summary.observedPositiveHabits.entries()) {
    items.push({
      id: `personal-habit-${index}`,
      source: "personal_history",
      title: "Observed positive habit",
      summary: habit,
      confidence: mapPersonalConfidence(summary.confidenceLabel),
      relevance: "moderate",
      limitations: ["Logged habit only."],
      sourceLabel: MIOS_SOURCE_LABELS.personal_history,
      isAvailable: true,
    });
  }

  return items.slice(0, 12);
}

export function hasInsufficientPersonalData(summary: PersonalHealthSummary): boolean {
  return !summary.authenticated || summary.hasInsufficientData || summary.totalRecords < 3;
}
