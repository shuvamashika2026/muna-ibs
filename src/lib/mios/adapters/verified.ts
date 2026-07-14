import type { VerifiedGuidanceItem } from "@/lib/verified-guidance/types";
import type { MiosEvidenceItem } from "@/lib/mios/types";
import { MIOS_SOURCE_LABELS, MIOS_VERIFIED_GUIDANCE_LIMIT } from "@/lib/mios/types";

export function mapApprovedVerifiedGuidanceToEvidence(
  items: VerifiedGuidanceItem[]
): MiosEvidenceItem[] {
  return items
    .filter((item) => item.review_status === "approved" && item.is_active)
    .slice(0, MIOS_VERIFIED_GUIDANCE_LIMIT)
    .map((item) => ({
      id: `verified-${item.external_id}`,
      source: "verified_guidance" as const,
      title: item.title,
      summary: item.summary,
      confidence: "moderate" as const,
      relevance: "high" as const,
      limitations: [
        "Reviewed clinical guidance summary only; not a substitute for individual medical advice.",
        ...(item.contraindications.length
          ? [`Contraindications noted: ${item.contraindications.slice(0, 3).join(", ")}.`]
          : []),
      ],
      citationUrl: item.citation_url,
      sourceLabel: MIOS_SOURCE_LABELS.verified_guidance,
      isAvailable: true,
      topics: [item.topic],
    }));
}

export async function fetchVerifiedGuidanceEvidenceForMios(): Promise<MiosEvidenceItem[]> {
  // Approved server-side retrieval is not wired in Version 1.
  return [];
}
