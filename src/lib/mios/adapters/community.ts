import type { CommunityKnowledgeRetrievalRecord, CommunityKnowledgeRetrievalResult } from "@/lib/community-knowledge/retrieval";
import { normalizeMiosConfidence } from "@/lib/mios/confidence";
import type { MiosEvidenceItem } from "@/lib/mios/types";
import { MIOS_COMMUNITY_LIMIT, MIOS_SOURCE_LABELS } from "@/lib/mios/types";

function mapCommunityRecord(record: CommunityKnowledgeRetrievalRecord, index: number): MiosEvidenceItem {
  const summaryParts = [
    record.summary,
    record.matchingSymptoms.length ? `Matching symptoms: ${record.matchingSymptoms.join(", ")}.` : "",
    record.matchingTriggers.length ? `Matching triggers: ${record.matchingTriggers.join(", ")}.` : "",
  ].filter(Boolean);

  return {
    id: `community-${index}-${record.external_id}`,
    source: "community",
    title: record.title,
    summary: summaryParts.join(" "),
    confidence: normalizeMiosConfidence(record.confidence),
    relevance: record.priority === "critical" || record.priority === "high" ? "high" : "moderate",
    limitations: [
      "Anecdotal community experience only; not clinical evidence.",
      ...(record.misinformation.length ? [`Misinformation flags present: ${record.misinformation.slice(0, 3).join(", ")}.`] : []),
    ],
    sourceLabel: MIOS_SOURCE_LABELS.community,
    isAvailable: true,
    topics: [...record.matchingSymptoms, ...record.matchingTriggers, ...record.matchingInterventions].map((item) =>
      item.toLowerCase()
    ),
  };
}

export function mapCommunityRetrievalToEvidence(
  result: CommunityKnowledgeRetrievalResult
): MiosEvidenceItem[] {
  if (result.internalError || result.safetyMatched || !result.records.length) {
    return [];
  }

  return result.records.slice(0, MIOS_COMMUNITY_LIMIT).map(mapCommunityRecord);
}

export function buildCommunitySafetyResult(result: CommunityKnowledgeRetrievalResult) {
  return {
    safetyMatched: result.safetyMatched,
    safetyAction: result.safetyAction,
    matchedThemes: result.matchedThemes,
  };
}
