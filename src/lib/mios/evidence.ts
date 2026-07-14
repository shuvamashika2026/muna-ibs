import type {
  MiosEvidenceConflict,
  MiosEvidenceItem,
  MiosEvidenceSource,
  MiosMergedEvidence,
  MiosSafetyResult,
} from "@/lib/mios/types";
import {
  MIOS_COMMUNITY_LIMIT,
  MIOS_EVIDENCE_AUTHORITY_ORDER,
  MIOS_SOURCE_LABELS,
  MIOS_VERIFIED_GUIDANCE_LIMIT,
} from "@/lib/mios/types";

export type MergeEvidenceInput = {
  safetyResult: MiosSafetyResult;
  personalEvidence: MiosEvidenceItem[];
  experimentEvidence: MiosEvidenceItem[];
  verifiedGuidanceEvidence: MiosEvidenceItem[];
  communityEvidence: MiosEvidenceItem[];
  generalKnowledgeEvidence?: MiosEvidenceItem[];
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupeKey(item: MiosEvidenceItem): string {
  return `${item.source}:${normalizeKey(item.title)}:${normalizeKey(item.summary)}`;
}

function sortByAuthority(items: MiosEvidenceItem[]): MiosEvidenceItem[] {
  return [...items].sort((left, right) => {
    const leftRank = MIOS_EVIDENCE_AUTHORITY_ORDER.indexOf(left.source);
    const rightRank = MIOS_EVIDENCE_AUTHORITY_ORDER.indexOf(right.source);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.id.localeCompare(right.id);
  });
}

function limitBySource(
  items: MiosEvidenceItem[],
  source: MiosEvidenceSource,
  limit: number
): MiosEvidenceItem[] {
  const selected: MiosEvidenceItem[] = [];
  for (const item of items) {
    if (item.source !== source) {
      continue;
    }
    if (selected.length >= limit) {
      continue;
    }
    selected.push(item);
  }
  return selected;
}

function extractFoodTokens(text: string): string[] {
  const foods = ["garlic", "onion", "dairy", "gluten", "lettuce", "wheat", "milk", "coffee"];
  const normalized = normalizeKey(text);
  return foods.filter((food) => normalized.includes(food));
}

function detectToleranceConflict(
  personalEvidence: MiosEvidenceItem[],
  communityEvidence: MiosEvidenceItem[]
): MiosEvidenceConflict[] {
  const conflicts: MiosEvidenceConflict[] = [];

  for (const personal of personalEvidence) {
    const personalFoods = extractFoodTokens(`${personal.title} ${personal.summary}`);
    if (!personalFoods.length) {
      continue;
    }

    const indicatesTolerance =
      /\btolerat(ed|es|ance)\b/i.test(`${personal.title} ${personal.summary}`) ||
      /\bwithout elevated symptoms\b/i.test(personal.summary) ||
      /\bno clear trigger\b/i.test(personal.summary);

    if (!indicatesTolerance) {
      continue;
    }

    for (const community of communityEvidence) {
      const communityFoods = extractFoodTokens(`${community.title} ${community.summary}`);
      const overlap = personalFoods.filter((food) => communityFoods.includes(food));
      const indicatesTrigger =
        /\btrigger\b/i.test(`${community.title} ${community.summary}`) ||
        overlap.some((food) => (community.topics ?? []).includes(food));

      if (!overlap.length) {
        continue;
      }

      if (indicatesTrigger || /\bbloating\b/i.test(community.summary)) {
        conflicts.push({
          description: `Personal logs suggest tolerance to ${overlap.join(", ")}, while community records report variable experiences with the same item.`,
          primarySource: "personal_history",
          secondarySource: "community",
          resolutionNote:
            "Keep personal observations primary, note that experiences vary, and avoid universal food restrictions.",
        });
      }
    }
  }

  return conflicts;
}

function buildSafetyEvidence(safetyResult: MiosSafetyResult): MiosEvidenceItem[] {
  if (!safetyResult.safetyMatched) {
    return [];
  }

  return [
    {
      id: "safety-screening",
      source: "safety",
      title: "Safety screening match",
      summary: `Safety themes matched: ${safetyResult.matchedThemes.join(", ") || "unspecified"}.`,
      confidence: "higher",
      relevance: "high",
      limitations: ["Safety screening is not a diagnosis."],
      sourceLabel: MIOS_SOURCE_LABELS.safety,
      isAvailable: true,
    },
  ];
}

function unavailableSources(input: MergeEvidenceInput): MiosEvidenceSource[] {
  const unavailable: MiosEvidenceSource[] = [];
  const buckets: Array<[MiosEvidenceSource, MiosEvidenceItem[]]> = [
    ["personal_history", input.personalEvidence],
    ["experiment", input.experimentEvidence],
    ["verified_guidance", input.verifiedGuidanceEvidence],
    ["community", input.communityEvidence],
    ["general_knowledge", input.generalKnowledgeEvidence ?? []],
  ];

  for (const [source, items] of buckets) {
    if (!items.some((item) => item.isAvailable)) {
      unavailable.push(source);
    }
  }

  return unavailable;
}

export function mergeEvidence(input: MergeEvidenceInput): MiosMergedEvidence {
  const safetyItems = buildSafetyEvidence(input.safetyResult);

  const availablePersonal = input.personalEvidence.filter((item) => item.isAvailable);
  const availableExperiment = input.experimentEvidence.filter((item) => item.isAvailable);
  const availableVerified = limitBySource(
    input.verifiedGuidanceEvidence.filter((item) => item.isAvailable),
    "verified_guidance",
    MIOS_VERIFIED_GUIDANCE_LIMIT
  );
  const availableCommunity = limitBySource(
    input.communityEvidence.filter((item) => item.isAvailable),
    "community",
    MIOS_COMMUNITY_LIMIT
  );
  const availableGeneral = (input.generalKnowledgeEvidence ?? []).filter((item) => item.isAvailable);

  const combined = sortByAuthority([
    ...safetyItems,
    ...availableVerified,
    ...availablePersonal,
    ...availableExperiment,
    ...availableCommunity,
    ...availableGeneral,
  ]);

  const deduped: MiosEvidenceItem[] = [];
  const seen = new Set<string>();

  for (const item of combined) {
    const key = dedupeKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  const conflicts = detectToleranceConflict(availablePersonal, availableCommunity);

  return {
    items: deduped,
    conflicts,
    unavailableSources: unavailableSources(input),
  };
}

export function primaryEvidenceSource(
  merged: MiosMergedEvidence,
  safetyMatched: boolean
): MiosEvidenceSource | null {
  if (safetyMatched) {
    return merged.items.find((item) => item.source === "safety")?.source ?? "safety";
  }

  const relevantPersonal = merged.items.find(
    (item) =>
      item.source === "personal_history" && item.isAvailable && item.relevance === "high"
  );
  if (relevantPersonal) {
    return "personal_history";
  }

  const priority: MiosEvidenceSource[] = [
    "verified_guidance",
    "experiment",
    "personal_history",
    "community",
    "general_knowledge",
  ];

  for (const source of priority) {
    if (merged.items.some((item) => item.source === source && item.isAvailable)) {
      return source;
    }
  }

  return null;
}
